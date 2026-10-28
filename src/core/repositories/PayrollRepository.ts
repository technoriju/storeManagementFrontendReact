import { BaseRepository } from './BaseRepository';
import { Payroll } from '../../types/models';
import { db } from '../database/db';

export class PayrollRepository extends BaseRepository<Payroll> {
  protected tableName = 'payrolls';

  async getAll(): Promise<Payroll[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  async insert(entity: Payroll): Promise<void> {
    await super.insert(entity, false);
  }

  async update(entity: Payroll): Promise<void> {
    await super.update(entity, false);
  }

  async delete(itemOrId: number | Payroll): Promise<void> {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    await db.execute(`DELETE FROM payrolls WHERE id = ?`, [id]);
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
