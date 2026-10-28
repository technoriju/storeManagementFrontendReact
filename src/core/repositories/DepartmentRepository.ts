import { BaseRepository } from './BaseRepository';
import { Department } from '../../types/models';
import { db } from '../database/db';

export class DepartmentRepository extends BaseRepository<Department> {
  protected tableName = 'departments';

  async getAll(): Promise<Department[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  async insert(entity: Department): Promise<void> {
    await super.insert(entity, false);
  }

  async update(entity: Department): Promise<void> {
    await super.update(entity, false);
  }

  async delete(itemOrId: number | Department): Promise<void> {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    await db.execute(`DELETE FROM departments WHERE id = ?`, [id]);
  }

  protected getInsertColumns(): string {
    return 'id, backendId, name, code, description, managerName, status, createdAt, updatedAt, deletedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'backendId = ?, name = ?, code = ?, description = ?, managerName = ?, status = ?, createdAt = ?, updatedAt = ?, deletedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Department): any[] {
    return [
      entity.id || Math.floor(Math.random() * -1000000000),
      entity.backendId || null,
      entity.name || '',
      entity.code || '',
      entity.description || '',
      entity.managerName || '',
      entity.status || 'ACTIVE',
      entity.createdAt || new Date().toISOString(),
      entity.updatedAt || new Date().toISOString(),
      entity.deletedAt || null,
      entity.syncStatus || 'synced',
    ];
  }

  protected fromRow(row: any): Department {
    return {
      id: Number(row.id || 0),
      backendId: row.backendId,
      name: row.name || '',
      code: row.code || '',
      description: row.description || '',
      managerName: row.managerName || '',
      status: row.status || 'ACTIVE',
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: row.updatedAt || new Date().toISOString(),
      deletedAt: row.deletedAt,
      syncStatus: row.syncStatus,
    };
  }
}

export const departmentRepository = new DepartmentRepository();
