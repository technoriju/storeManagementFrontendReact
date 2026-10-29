import { BaseRepository } from './BaseRepository';
import { Holiday } from '../../types/models';
import { db } from '../database/db';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';

export class HolidayRepository extends BaseRepository<Holiday> {
  protected tableName = 'holidays';

  async getAll(): Promise<Holiday[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }

  async insert(entity: Holiday): Promise<void> {
    try {
      const res = await apiClient.post(API_ENDPOINTS.HRM.HOLIDAYS, {
        name: entity.name,
        date: entity.date,
        type: entity.type,
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

  async update(entity: Holiday): Promise<void> {
    await super.update(entity, false);
  }

  async delete(itemOrId: number | Holiday): Promise<void> {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    const existing = typeof itemOrId === 'number' ? await this.getById(id) : itemOrId;
    const targetId = existing?.backendId || id;
    try {
      if (targetId && targetId > 0) {
        await apiClient.delete(API_ENDPOINTS.HRM.HOLIDAY_BY_ID(targetId));
      }
    } catch (e) {}
    await db.execute(`DELETE FROM holidays WHERE id = ?`, [id]);
  }

  public async fetchFromApi(): Promise<Holiday[]> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.HRM.HOLIDAYS);
      const items = res.data?.data || res.data || [];
      if (Array.isArray(items)) {
        for (const item of items) {
          const dateStr = item.date ? String(item.date).split('T')[0] : '';
          const dayOfWeek = dateStr ? new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' }) : 'Weekday';
          const normalized: Holiday = {
            id: Number(item.id),
            backendId: Number(item.id),
            name: item.name || '',
            date: dateStr,
            dayOfWeek,
            type: item.type || 'PUBLIC',
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
    return 'id, backendId, name, date, dayOfWeek, type, description, status, createdAt, updatedAt, deletedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'backendId = ?, name = ?, date = ?, dayOfWeek = ?, type = ?, description = ?, status = ?, createdAt = ?, updatedAt = ?, deletedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Holiday): any[] {
    return [
      entity.id || Math.floor(Math.random() * -1000000000),
      entity.backendId || null,
      entity.name || '',
      entity.date || new Date().toISOString().split('T')[0],
      entity.dayOfWeek || '',
      entity.type || 'PUBLIC',
      entity.description || '',
      entity.status || 'ACTIVE',
      entity.createdAt || new Date().toISOString(),
      entity.updatedAt || new Date().toISOString(),
      entity.deletedAt || null,
      entity.syncStatus || 'synced',
    ];
  }

  protected fromRow(row: any): Holiday {
    return {
      id: Number(row.id || 0),
      backendId: row.backendId,
      name: row.name || '',
      date: row.date || '',
      dayOfWeek: row.dayOfWeek || '',
      type: row.type || 'PUBLIC',
      description: row.description || '',
      status: row.status || 'ACTIVE',
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: row.updatedAt || new Date().toISOString(),
      deletedAt: row.deletedAt,
      syncStatus: row.syncStatus,
    };
  }
}

export const holidayRepository = new HolidayRepository();
