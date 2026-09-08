import { BaseRepository } from './BaseRepository';
import { Category } from '../../types/models';
import { apiClient } from '../api/api-client';

export class CategoryRepository extends BaseRepository<Category> {
  protected tableName = 'categories';

  protected getInsertColumns(): string {
    return 'id, name, description, parentId, createdAt, updatedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'name = ?, description = ?, parentId = ?, createdAt = ?, updatedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Category): any[] {
    return [
      entity.id,
      entity.name,
      entity.description || null,
      entity.parentId || null,
      entity.createdAt,
      entity.updatedAt,
      entity.syncStatus || 'synced'
    ];
  }

  protected fromRow(row: any): Category {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      parentId: row.parentId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      syncStatus: row.syncStatus,
    };
  }

  protected async syncWithApi(entity: Category, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      if (operation === 'insert') {
        await apiClient.post('/categories', entity);
      } else if (operation === 'update') {
        await apiClient.put(`/categories/${entity.id}`, entity);
      } else if (operation === 'delete') {
        await apiClient.delete(`/categories/${entity.id}`);
      }
      
      if (operation !== 'delete' && entity.syncStatus !== 'synced') {
        entity.syncStatus = 'synced';
        await this.update(entity);
      }
    } catch (error) {
      console.error(`Failed to sync category ${entity.id} with API:`, error);
    }
  }

  public async fetchFromApi(): Promise<void> {
    try {
      const response = await apiClient.get('/categories');
      const items: Category[] = response.data;

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
      console.error('Failed to fetch categories from API:', error);
    }
  }
}

export const categoryRepository = new CategoryRepository();
