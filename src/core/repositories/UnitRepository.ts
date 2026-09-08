import { BaseRepository } from './BaseRepository';
import { Unit } from '../../types/models';
import { apiClient } from '../api/api-client';

export class UnitRepository extends BaseRepository<Unit> {
  protected tableName = 'units';

  protected getInsertColumns(): string {
    return 'id, name, abbreviation, createdAt, updatedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'name = ?, abbreviation = ?, createdAt = ?, updatedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Unit): any[] {
    return [
      entity.id,
      entity.name,
      entity.abbreviation,
      entity.createdAt,
      entity.updatedAt,
      entity.syncStatus || 'synced'
    ];
  }

  protected fromRow(row: any): Unit {
    return {
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      syncStatus: row.syncStatus,
    };
  }

  protected async syncWithApi(entity: Unit, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      if (operation === 'insert') {
        await apiClient.post('/units', entity);
      } else if (operation === 'update') {
        await apiClient.put(`/units/${entity.id}`, entity);
      } else if (operation === 'delete') {
        await apiClient.delete(`/units/${entity.id}`);
      }
      
      if (operation !== 'delete' && entity.syncStatus !== 'synced') {
        entity.syncStatus = 'synced';
        await this.update(entity);
      }
    } catch (error) {
      console.error(`Failed to sync unit ${entity.id} with API:`, error);
    }
  }

  public async fetchFromApi(): Promise<void> {
    try {
      const response = await apiClient.get('/units');
      const items: Unit[] = response.data;

      for (const item of items) {
        item.syncStatus = 'synced';
        const existing = await this.getById(item.id);
        if (existing) {
          await this.update(item);
        } else {
          await this.insert(item);
        }
      }
    } catch (error) {
      console.error('Failed to fetch units from API:', error);
    }
  }
}

export const unitRepository = new UnitRepository();
