import { BaseRepository } from './BaseRepository';
import { Department } from '../../types/models';
import { db } from '../database/db';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';

export class DepartmentRepository extends BaseRepository<Department> {
  protected tableName = 'departments';

  async getAll(): Promise<Department[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  async insert(entity: Department): Promise<void> {
    try {
      const res = await apiClient.post(API_ENDPOINTS.HRM.DEPARTMENTS, {
        name: entity.name,
        code: entity.code,
        description: entity.description,
        managerName: entity.managerName,
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

  async update(entity: Department): Promise<void> {
    const targetId = entity.backendId || entity.id;
    try {
      if (targetId && targetId > 0) {
        await apiClient.patch(API_ENDPOINTS.HRM.DEPARTMENT_BY_ID(targetId), {
          name: entity.name,
          code: entity.code,
          description: entity.description,
          managerName: entity.managerName,
          status: entity.status,
        });
      }
    } catch (e) {}
    await super.update(entity, false);
  }

  async delete(itemOrId: number | Department): Promise<void> {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    const existing = typeof itemOrId === 'number' ? await this.getById(id) : itemOrId;
    const targetId = existing?.backendId || id;
    try {
      if (targetId && targetId > 0) {
        await apiClient.delete(API_ENDPOINTS.HRM.DEPARTMENT_BY_ID(targetId));
      }
    } catch (e) {}
    await db.execute(`DELETE FROM departments WHERE id = ?`, [id]);
  }

  public async fetchFromApi(): Promise<Department[]> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.HRM.DEPARTMENTS);
      const items = res.data?.data || res.data || [];
      if (Array.isArray(items)) {
        for (const item of items) {
          const normalized: Department = {
            id: Number(item.id),
            backendId: Number(item.id),
            name: item.name || '',
            code: item.code || '',
            description: item.description || '',
            managerName: item.managerName || '',
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
