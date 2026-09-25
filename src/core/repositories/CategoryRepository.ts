import { BaseRepository } from './BaseRepository';
import { Category } from '../../types/models';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';
import { db } from '../database/db';
import { outboxRepo, tombstoneRepo, OutboxItem } from '../sync/outbox';

export class CategoryRepository extends BaseRepository<Category> {
  protected tableName = 'categories';

  private requestSync(): void {
    void import('../sync/SyncEngine').then(({ syncEngine }) => syncEngine.syncNow());
  }

  async getAll(): Promise<Category[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
  }

  async insert(entity: Category, shouldSync = true): Promise<void> {
    const localEntity: Category = { ...entity, syncStatus: shouldSync ? 'pending_insert' : 'synced' };
    await super.insert(localEntity, false);
    if (shouldSync) {
      await outboxRepo.add('categories', localEntity.id, 'CREATE', localEntity);
      this.requestSync();
    }
  }

  async update(entity: Category, shouldSync = true): Promise<void> {
    const localEntity: Category = { ...entity, syncStatus: shouldSync ? 'pending_update' : 'synced' };
    await super.update(localEntity, false);
    if (shouldSync) {
      await outboxRepo.add('categories', localEntity.id, 'UPDATE', localEntity);
      this.requestSync();
    }
  }

  async delete(id: string, shouldSync = true): Promise<void> {
    const entity = await this.getById(id);
    if (!entity) return;
    await db.execute(`DELETE FROM categories WHERE id = ?`, [id]);
    if (shouldSync) {
      await tombstoneRepo.add('categories', id);
      // Cancel older CREATE/UPDATE jobs for deleted local records.
      await outboxRepo.removeForEntity('categories', id);
      if (!/^\d+$/.test(String(id))) return;
      await outboxRepo.add('categories', id, 'DELETE', entity);
      this.requestSync();
    }
  }

  protected getInsertColumns(): string {
    return 'id, backendId, name, description, parentId, createdAt, updatedAt, deletedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'backendId = ?, name = ?, description = ?, parentId = ?, createdAt = ?, updatedAt = ?, deletedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Category): any[] {
    return [
      entity.id || Math.random().toString(36).substring(7),
      entity.backendId || null,
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
      backendId: row.backendId || undefined,
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
      const {
        syncStatus,
        id,
        backendId,
        version,
        createdAt,
        updatedAt,
        parentId,
        deletedAt,
        ...baseApiPayload
      } = entity as any;
      const apiPayload = operation === 'update'
        ? baseApiPayload
        : { ...baseApiPayload, ...(parentId !== undefined && { parentId }) };
      
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
        const backendId = entity.backendId || entity.id;
        const response = await apiClient.patch(API_ENDPOINTS.CATEGORIES.BY_ID(backendId), apiPayload);
        if (response.status >= 200 && response.status < 300) syncSuccess = true;
      } else if (operation === 'delete') {
        const backendId = entity.backendId || entity.id;
        const response = await apiClient.delete(API_ENDPOINTS.CATEGORIES.BY_ID(backendId));
        if (response.status >= 200 && response.status < 300) syncSuccess = true;
      }
      
      if (operation !== 'delete' && syncSuccess && entity.syncStatus !== 'synced') {
        entity.syncStatus = 'synced';
        await this.update(entity, false);
      }
      
    } catch (error: any) {
      // DELETE is idempotent. Missing server record means already synced.
      const responseStatus =
        error?.response?.status ??
        error?.response?.data?.statusCode ??
        error?.statusCode ??
        error?.status;
      if (operation === 'delete' && responseStatus >= 400 && responseStatus < 500) {
        return;
      }
      console.error(`Failed to sync category ${entity.id} with API:`, error);
      throw error;
    }
  }

  async syncOutboxItem(item: OutboxItem): Promise<void> {
    // Tombstone means local record was deleted. Older jobs are stale.
    if (item.operation !== 'DELETE' && await tombstoneRepo.isDeleted('categories', item.entityId)) {
      return;
    }
    const entity = item.payload ? JSON.parse(item.payload) as Category : await this.getById(item.entityId);
    if (item.operation === 'DELETE') {
      // Temporary offline IDs are not server IDs. Remove their delete job locally.
      if (!/^\d+$/.test(String(item.entityId))) return;
      await this.syncWithApi(entity || ({ id: item.entityId } as Category), 'delete');
      return;
    }
    if (!entity) throw new Error(`Category ${item.entityId} not found`);
    await this.syncWithApi(entity, item.operation === 'CREATE' ? 'insert' : 'update');
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

      const latestItems = items
        .slice()
        .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));

      for (const rawItem of latestItems) {
        try {
          const item: any = { ...rawItem };
          item.backendId = String(item.backendId || item.serverId || item.categoryId || item._id || item.id || '');
          item.id = String(item.id || item.backendId || Math.random().toString(36).substring(7));
          item.name = item.name || item.categoryName || item.category_name || item.title || 'Unnamed Category';
          item.description = item.description || item.categoryDescription || item.category_description || null;
          item.syncStatus = 'synced';
          item.createdAt = item.createdAt || new Date().toISOString();
          item.updatedAt = item.updatedAt || new Date().toISOString();
          
          // API item is server-confirmed. Never keep stale local pending status
          // when same category exists in API response.
          const existing = await super.getById(item.id);
          if (existing) {
            await super.update(item, false);
          } else {
            await this.insert(item, false);
          }

          normalizedItems.push(item as Category);
        } catch (err) {
          console.error("DB Insert/Update Error for item:", rawItem, err);
        }
      }
      const incomingIds = normalizedItems.map(item => item.id);
      if (incomingIds.length > 0) {
        const placeholders = incomingIds.map(() => '?').join(',');
        await db.execute(`DELETE FROM categories WHERE syncStatus = 'synced' AND id NOT IN (${placeholders})`, incomingIds);
      } else {
        await db.execute(`DELETE FROM categories WHERE syncStatus = 'synced'`);
      }
      return normalizedItems;
    } catch (error) {
      console.error('Failed to fetch categories from API:', error);
      return [];
    }
  }
}

export const categoryRepository = new CategoryRepository();
