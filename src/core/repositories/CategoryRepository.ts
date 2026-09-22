import { BaseRepository } from './BaseRepository';
import { Category } from '../../types/models';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';
import { db } from '../database/db';
import { DeviceEventEmitter } from 'react-native';

export class CategoryRepository extends BaseRepository<Category> {
  protected tableName = 'categories';

  async update(entity: Category, shouldSync = true): Promise<void> {
    if (shouldSync) {
      await this.syncWithApi(entity, 'update');
      await super.update({ ...entity, syncStatus: 'synced' }, false);
      return;
    }

    await super.update(entity, false);
  }

  async delete(id: string, shouldSync = true): Promise<void> {
    if (shouldSync) {
      await apiClient.delete(API_ENDPOINTS.CATEGORIES.BY_ID(String(id)));
    }

    const entity = await this.getById(id);
    if (entity) await super.delete(id, false);
  }

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
      // API generates timestamps; keep local timestamps out of request payload.
      const { syncStatus, id, version, createdAt, updatedAt, ...apiPayload } = entity as any;
      
      let syncSuccess = false;

      if (operation === 'insert') {
        const response = await apiClient.post(API_ENDPOINTS.CATEGORIES.BASE, apiPayload);
        const serverId = response.data?.id || (response.data?.data && response.data.data.id);
        if (serverId && serverId.toString() !== entity.id.toString()) {
           // Update local DB to use server ID instead of temporary local ID
           await db.execute(`UPDATE categories SET id = ?, syncStatus = 'synced' WHERE id = ?`, [serverId.toString(), entity.id]);
           syncSuccess = true;
        } else if (response.status >= 200 && response.status < 300) {
           syncSuccess = true;
        }
      } else if (operation === 'update') {
        const response = await apiClient.patch(API_ENDPOINTS.CATEGORIES.BY_ID(entity.id), apiPayload);
        if (response.status >= 200 && response.status < 300) syncSuccess = true;
      } else if (operation === 'delete') {
        const response = await apiClient.delete(API_ENDPOINTS.CATEGORIES.BY_ID(entity.id));
        if (response.status >= 200 && response.status < 300) syncSuccess = true;
      }
      
      if (operation !== 'delete' && syncSuccess && entity.syncStatus !== 'synced') {
        entity.syncStatus = 'synced';
        await this.update(entity, false);
      }
      
      if (syncSuccess) {
        DeviceEventEmitter.emit('CategorySyncComplete');
      }
    } catch (error) {
      console.error(`Failed to sync category ${entity.id} with API:`, error);
      throw error;
    }
  }

  public async fetchFromApi(): Promise<Category[]> {
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

      const normalizedItems: Category[] = [];

      for (const rawItem of items) {
        try {
          const item: any = { ...rawItem };
          item.id = String(item.id || item._id || item.categoryId || Math.random().toString(36).substring(7));
          item.name = item.name || item.categoryName || item.category_name || item.title || 'Unnamed Category';
          item.description = item.description || item.categoryDescription || item.category_description || null;
          item.syncStatus = 'synced';
          item.createdAt = item.createdAt || new Date().toISOString();
          item.updatedAt = item.updatedAt || new Date().toISOString();
          
          const existing = await this.getById(item.id);
          if (existing) {
            await this.update(item, false);
          } else {
            await this.insert(item, false);
          }

          normalizedItems.push(item as Category);
        } catch (err) {
          console.error("DB Insert/Update Error for item:", rawItem, err);
        }
      }
      return normalizedItems;
    } catch (error) {
      console.error('Failed to fetch categories from API:', error);
      return [];
    }
  }
}

export const categoryRepository = new CategoryRepository();
