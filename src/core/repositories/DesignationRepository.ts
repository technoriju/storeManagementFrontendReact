import { BaseRepository } from './BaseRepository';
import { Designation } from '../../types/models';
import { db } from '../database/db';

export class DesignationRepository extends BaseRepository<Designation> {
  protected tableName = 'designations';

  async getAll(): Promise<Designation[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  async insert(entity: Designation): Promise<void> {
    await super.insert(entity, false);
  }

  async update(entity: Designation): Promise<void> {
    await super.update(entity, false);
  }

  async delete(itemOrId: number | Designation): Promise<void> {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    await db.execute(`DELETE FROM designations WHERE id = ?`, [id]);
  }

  protected getInsertColumns(): string {
    return 'id, backendId, name, code, departmentId, departmentName, description, status, createdAt, updatedAt, deletedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'backendId = ?, name = ?, code = ?, departmentId = ?, departmentName = ?, description = ?, status = ?, createdAt = ?, updatedAt = ?, deletedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Designation): any[] {
    return [
      entity.id || Math.floor(Math.random() * -1000000000),
      entity.backendId || null,
      entity.name || '',
      entity.code || '',
      entity.departmentId || null,
      entity.departmentName || '',
      entity.description || '',
      entity.status || 'ACTIVE',
      entity.createdAt || new Date().toISOString(),
      entity.updatedAt || new Date().toISOString(),
      entity.deletedAt || null,
      entity.syncStatus || 'synced',
    ];
  }

  protected fromRow(row: any): Designation {
    return {
      id: Number(row.id || 0),
      backendId: row.backendId,
      name: row.name || '',
      code: row.code || '',
      departmentId: row.departmentId ? Number(row.departmentId) : undefined,
      departmentName: row.departmentName || '',
      description: row.description || '',
      status: row.status || 'ACTIVE',
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: row.updatedAt || new Date().toISOString(),
      deletedAt: row.deletedAt,
      syncStatus: row.syncStatus,
    };
  }
}

export const designationRepository = new DesignationRepository();
