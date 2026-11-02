import { BaseRepository } from './BaseRepository';
import { Payroll } from '../../types/models';
import { db } from '../database/db';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';
import { employeeRepository } from './EmployeeRepository';

export class PayrollRepository extends BaseRepository<Payroll> {
  protected tableName = 'payrolls';

  async getAll(): Promise<Payroll[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  async insert(entity: Payroll): Promise<void> {
    try {
      let targetEmpId = entity.employeeId;
      if (targetEmpId <= 0) {
        const localEmp = await employeeRepository.getById(targetEmpId);
        if (localEmp?.backendId) targetEmpId = localEmp.backendId;
      }

      if (targetEmpId > 0) {
        const res = await apiClient.post(API_ENDPOINTS.HRM.PAYROLLS, {
          employeeId: targetEmpId,
          month: entity.month,
          year: entity.year,
          basicSalary: entity.basicSalary,
          allowances: entity.allowances,
          deductions: entity.deductions,
          netSalary: entity.netSalary,
          status: entity.status,
          notes: entity.notes,
        });
        const data = res.data?.data || res.data;
        if (data?.id) {
          entity.id = Number(data.id);
          entity.backendId = Number(data.id);
        }
      }
    } catch (e: any) {
      console.warn('[PayrollRepository] API insert failed:', e?.message || e);
    }
    await super.insert(entity, false);
  }

  async update(entity: Payroll): Promise<void> {
    const targetId = entity.backendId || entity.id;
    try {
      if (targetId && targetId > 0 && entity.status === 'PAID') {
        await apiClient.patch(API_ENDPOINTS.HRM.PAYROLL_PAY(targetId), {
          paymentDate: entity.paymentDate,
          paymentMethod: entity.paymentMethod,
        });
      }
    } catch (e: any) {
      console.warn('[PayrollRepository] API update failed:', e?.message || e);
    }
    await super.update(entity, false);
  }

  async delete(itemOrId: number | Payroll): Promise<void> {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    const existing = typeof itemOrId === 'number' ? await this.getById(id) : itemOrId;
    const targetId = existing?.backendId || id;
    try {
      if (targetId && targetId > 0) {
        await apiClient.delete(API_ENDPOINTS.HRM.PAYROLL_BY_ID(targetId));
      }
    } catch (e) {}
    await db.execute(`DELETE FROM payrolls WHERE id = ? OR backendId = ?`, [id, targetId]);
  }

  public async fetchFromApi(): Promise<Payroll[]> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.HRM.PAYROLLS);
      const items = res.data?.data || res.data || [];
      if (Array.isArray(items)) {
        const incomingIds: number[] = [];
        for (const item of items) {
          const normalized: Payroll = {
            id: Number(item.id),
            backendId: Number(item.id),
            employeeId: Number(item.employeeId),
            employeeName: item.employeeName || (item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : ''),
            departmentName: item.departmentName || '',
            designationName: item.designationName || '',
            month: item.month || 'October',
            year: Number(item.year || new Date().getFullYear()),
            basicSalary: Number(item.basicSalary || 0),
            allowances: Number(item.allowances || 0),
            deductions: Number(item.deductions || 0),
            netSalary: Number(item.netSalary || 0),
            paymentDate: item.paymentDate ? String(item.paymentDate).split('T')[0] : undefined,
            paymentMethod: item.paymentMethod || undefined,
            status: item.status || 'PENDING',
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
          await db.execute(`DELETE FROM payrolls WHERE syncStatus = 'synced' AND id NOT IN (${placeholders})`, incomingIds);
        } else {
          await db.execute(`DELETE FROM payrolls WHERE syncStatus = 'synced'`);
        }
      }
    } catch (e) {}
    return this.getAll();
  }

  protected getInsertColumns(): string {
    return 'id, backendId, employeeId, employeeName, departmentName, designationName, month, year, basicSalary, allowances, deductions, netSalary, paymentDate, paymentMethod, status, notes, createdAt, updatedAt, deletedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'backendId = ?, employeeId = ?, employeeName = ?, departmentName = ?, designationName = ?, month = ?, year = ?, basicSalary = ?, allowances = ?, deductions = ?, netSalary = ?, paymentDate = ?, paymentMethod = ?, status = ?, notes = ?, createdAt = ?, updatedAt = ?, deletedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Payroll): any[] {
    return [
      entity.id || Math.floor(Math.random() * -1000000000),
      entity.backendId || null,
      entity.employeeId,
      entity.employeeName || '',
      entity.departmentName || '',
      entity.designationName || '',
      entity.month || 'October',
      Number(entity.year || new Date().getFullYear()),
      Number(entity.basicSalary || 0),
      Number(entity.allowances || 0),
      Number(entity.deductions || 0),
      Number(entity.netSalary || 0),
      entity.paymentDate || null,
      entity.paymentMethod || null,
      entity.status || 'PENDING',
      entity.notes || '',
      entity.createdAt || new Date().toISOString(),
      entity.updatedAt || new Date().toISOString(),
      entity.deletedAt || null,
      entity.syncStatus || 'synced',
    ];
  }

  protected fromRow(row: any): Payroll {
    return {
      id: Number(row.id || 0),
      backendId: row.backendId,
      employeeId: Number(row.employeeId || 0),
      employeeName: row.employeeName || '',
      departmentName: row.departmentName || '',
      designationName: row.designationName || '',
      month: row.month || '',
      year: Number(row.year || new Date().getFullYear()),
      basicSalary: Number(row.basicSalary || 0),
      allowances: Number(row.allowances || 0),
      deductions: Number(row.deductions || 0),
      netSalary: Number(row.netSalary || 0),
      paymentDate: row.paymentDate,
      paymentMethod: row.paymentMethod,
      status: row.status || 'PENDING',
      notes: row.notes || '',
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: row.updatedAt || new Date().toISOString(),
      deletedAt: row.deletedAt,
      syncStatus: row.syncStatus,
    };
  }
}

export const payrollRepository = new PayrollRepository();
