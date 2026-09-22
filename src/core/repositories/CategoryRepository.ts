import { BaseRepository } from './BaseRepository';
import { Category } from '../../types/models';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';
import { db } from '../database/db';

export class CategoryRepository extends BaseRepository<Category> {
  protected tableName = 'categories';

  protected getInsertColumns(): string {
    return 'id, name, description, parentId, createdAt, updatedAt, deletedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'name = ?, description = ?, parentId = ?, createdAt = ?, updatedAt = ?, deletedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Category): any[] {
    return [
      entity.id || Math.random().toString(36).substring(7),
      entity.name || 'Unnamed Category',
      entity.description || null,
      entity.parentId || null,
      entity.createdAt || new Date().toISOString(),
      entity.updatedAt || new Date().toISOString(),
      entity.deletedAt || null,
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
      deletedAt: row.deletedAt,
      syncStatus: row.syncStatus,
    };
  }

  protected async syncWithApi(entity: Category, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      const { syncStatus, id, version, ...apiPayload } = entity as any;
      
      if (operation === 'insert') {
        const response = await apiClient.post(API_ENDPOINTS.CATEGORIES.BASE, apiPayload);
        const serverId = response.data?.id || (response.data?.data && response.data.data.id);
        if (serverId && serverId.toString() !== entity.id.toString()) {
           // Update local DB to use server ID instead of temporary local ID
           await db.execute(`UPDATE categories SET id = ?, syncStatus = 'synced' WHERE id = ?`, [serverId.toString(), entity.id]);
           return;
        }
      } else if (operation === 'update') {
        await apiClient.patch(API_ENDPOINTS.CATEGORIES.BY_ID(entity.id), apiPayload);
      } else if (operation === 'delete') {
        await apiClient.delete(API_ENDPOINTS.CATEGORIES.BY_ID(entity.id));
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
      const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.BASE);
      
      let items: any[] = [];
      console.log("API Response Data:", JSON.stringify(response.data).substring(0, 500));
      const findItems = (payload: any): any[] => {
        if (Array.isArray(payload)) return payload;
        if (!payload || typeof payload !== 'object') return [];

        for (const key of ['data', 'categories', 'items', 'results', 'rows']) {
          const found = findItems(payload[key]);
          if (found.length > 0) return found;
        }
        return [];
      };

      items = findItems(response.data);
      
      console.log(`Parsed ${items.length} items from API response.`);

      for (const rawItem of items) {
        try {
          const item: any = { ...rawItem };
          item.id = String(item.id || item._id || item.categoryId || Math.random().toString(36).substring(7));
          item.name = item.name || item.categoryName || item.title || 'Unnamed Category';
          item.description = item.description || item.categoryDescription || null;
          item.syncStatus = 'synced';
          item.createdAt = item.createdAt || new Date().toISOString();
          item.updatedAt = item.updatedAt || new Date().toISOString();
          
          const existing = await this.getById(item.id);
          if (existing) {
            await this.update(item, false);
          } else {
            await this.insert(item, false);
          }
        } catch (err) {
          console.error("DB Insert/Update Error for item:", rawItem, err);
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories from API:', error);
    }
  }
}

export const categoryRepository = new CategoryRepository();
