import { BaseRepository } from './BaseRepository';
import { SubCategory } from '../../types/models';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';
import { db } from '../database/db';
import { outboxRepo, tombstoneRepo, OutboxItem } from '../sync/outbox';

export class SubCategoryRepository extends BaseRepository<SubCategory> {
  protected tableName = 'sub_categories';

  private requestSync(): void {
    void import('../sync/SyncEngine').then(({ syncEngine }) => syncEngine.syncNow());
  }

  async getAll(): Promise<SubCategory[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  }

  async insert(entity: SubCategory, shouldSync = true): Promise<void> {
    const localEntity: SubCategory = { ...entity, syncStatus: shouldSync ? 'pending_insert' : 'synced' };
    await super.insert(localEntity, false);
    if (shouldSync) {
      await outboxRepo.add(this.tableName, localEntity.id, 'CREATE', localEntity);
      this.requestSync();
    }
  }

  async update(entity: SubCategory, shouldSync = true): Promise<void> {
    const localEntity: SubCategory = { ...entity, syncStatus: shouldSync ? 'pending_update' : 'synced' };
    await super.update(localEntity, false);
    if (shouldSync) {
      await outboxRepo.add(this.tableName, localEntity.id, 'UPDATE', localEntity);
      this.requestSync();
    }
  }

  async delete(id: string, shouldSync = true): Promise<void> {
    const entity = await this.getById(id);
    if (!entity) return;
    await db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    if (shouldSync) {
      await tombstoneRepo.add(this.tableName, id);
      await outboxRepo.removeForEntity(this.tableName, id);
      if (!/^\d+$/.test(String(id))) return;
      await outboxRepo.add(this.tableName, id, 'DELETE', entity);
      this.requestSync();
    }
  }

  protected getInsertColumns(): string {
    return 'id, backendId, name, description, categoryId, status, createdAt, updatedAt, deletedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'backendId = ?, name = ?, description = ?, categoryId = ?, status = ?, createdAt = ?, updatedAt = ?, deletedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: SubCategory): any[] {
    return [
      entity.id || Math.random().toString(36).substring(7),
      entity.backendId || null,
      entity.name || 'Unnamed SubCategory',
      entity.description || null,
      entity.categoryId || '',
      entity.status || 'active',
      entity.createdAt || new Date().toISOString(),
      entity.updatedAt || new Date().toISOString(),
      entity.deletedAt || null,
      entity.syncStatus || 'synced'
    ];
  }

  protected fromRow(row: any): SubCategory {
    return {
      id: row.id,
      backendId: row.backendId || undefined,
      name: row.name,
      description: row.description,
      categoryId: row.categoryId,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      syncStatus: row.syncStatus,
    };
  }

  protected async syncWithApi(entity: SubCategory, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      const {
        syncStatus,
        id,
        backendId,
        version,
        createdAt,
        updatedAt,
        deletedAt,
        name,
        description,
        status,
        categoryId,
      } = entity as any;
      
      // Send only fields accepted by the subcategory API.
      // Local/API records can contain deviceId and other read-only fields.
      const apiPayload = { name, description, categoryId, status };
      
      let syncSuccess = false;

      if (operation === 'insert') {
        const response = await apiClient.post(API_ENDPOINTS.SUBCATEGORIES.BASE, apiPayload);
        const responseData = response.data?.data || response.data;
        const serverId = responseData?.id || responseData?._id || responseData?.subcategoryId || responseData?.sub_category_id;
        if (serverId && serverId.toString() !== entity.id.toString()) {
           const newId = serverId.toString();
           await db.execute(`UPDATE ${this.tableName} SET id = ?, backendId = ?, syncStatus = 'synced' WHERE id = ?`, [newId, newId, entity.id]);
           await outboxRepo.rebaseEntity(this.tableName, entity.id, newId, newId);
           syncSuccess = true;
        } else if (response.status >= 200 && response.status < 300) {
           await db.execute(`UPDATE ${this.tableName} SET backendId = ?, syncStatus = 'synced' WHERE id = ?`, [serverId?.toString() || entity.backendId || entity.id, entity.id]);
           syncSuccess = true;
        }
      } else if (operation === 'update') {
        const backendId = entity.backendId || entity.id;
        const response = await apiClient.patch(API_ENDPOINTS.SUBCATEGORIES.BY_ID(backendId), apiPayload);
        if (response.status >= 200 && response.status < 300) syncSuccess = true;
      } else if (operation === 'delete') {
        const backendId = entity.backendId || entity.id;
        const response = await apiClient.delete(API_ENDPOINTS.SUBCATEGORIES.BY_ID(backendId));
        if (response.status >= 200 && response.status < 300) syncSuccess = true;
      }
      
      if (operation !== 'delete' && syncSuccess && entity.syncStatus !== 'synced') {
        entity.syncStatus = 'synced';
        await this.update(entity, false);
      }
      
    } catch (error: any) {
      const responseStatus =
        error?.response?.status ??
        error?.response?.data?.statusCode ??
        error?.statusCode ??
        error?.status;
      if (operation === 'delete' && responseStatus >= 400 && responseStatus < 500) {
        return;
      }
      console.error(`Failed to sync subCategory ${entity.id} with API:`, error);
      throw error;
    }
  }

  async syncOutboxItem(item: OutboxItem): Promise<void> {
    if (item.operation !== 'DELETE' && await tombstoneRepo.isDeleted(this.tableName, item.entityId)) {
      return;
    }
    const entity = item.payload ? JSON.parse(item.payload) as SubCategory : await this.getById(item.entityId);
    if (item.operation === 'DELETE') {
      const deleteEntity = entity || ({ id: item.entityId } as SubCategory);
      // Temporary local IDs have no backendId. Server IDs may be numeric or string.
      if (!deleteEntity.backendId && !/^\d+$/.test(String(deleteEntity.id))) return;
      await this.syncWithApi(deleteEntity, 'delete');
      return;
    }
    if (!entity) throw new Error(`SubCategory ${item.entityId} not found`);
    await this.syncWithApi(entity, item.operation === 'CREATE' ? 'insert' : 'update');
  }

  public async fetchFromApi(): Promise<SubCategory[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.SUBCATEGORIES.BASE);
      
      let items: any[] = [];
      const findItems = (payload: any): { found: boolean; items: any[] } => {
        if (Array.isArray(payload)) return { found: true, items: payload };
        if (!payload || typeof payload !== 'object') return { found: false, items: [] };
        for (const key of ['data', 'subcategories', 'subCategories', 'sub_category', 'subCategory', 'sub_categories', 'items', 'results', 'rows', 'docs', 'records', 'payload', 'response', 'body', 'list']) {
          const result = findItems(payload[key]);
          if (result.found) return result;
        }
        // Accept unknown API envelope names when endpoint already identifies resource.
        for (const value of Object.values(payload)) {
          if (Array.isArray(value)) return { found: true, items: value };
        }
        return { found: false, items: [] };
      };

      const parsed = findItems(response.data);
      items = parsed.items;
      console.log('SubCategory API response:', JSON.stringify(response.data).substring(0, 200));
      console.log('SubCategory items found:', items?.length);

      // Do not erase local synced data when server response shape is unknown.
      if (!parsed.found) return this.getAll();
      
      const normalizedItems: SubCategory[] = [];

      const latestItems = items
        .slice()
        .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));

      for (const rawItem of latestItems) {
        try {
          const item: any = { ...rawItem };
          item.backendId = String(item.backendId || item.serverId || item.subcategoryId || item.subcategory_id || item.sub_category_id || item._id || item.id || '');
          item.id = String(item.id || item.backendId || Math.random().toString(36).substring(7));
          item.name = item.name || item.subCategoryName || item.sub_category_name || item.subCategory || item.subcategory || item.sub_category || item.title || 'Unnamed SubCategory';
          item.description = item.description || null;
          item.categoryId = String(item.categoryId || item.category_id || item.category?._id || item.category?.id || (typeof item.category === 'string' ? item.category : ''));
          item.status = item.status || (item.isActive === false ? 'inactive' : 'active');
          item.syncStatus = 'synced';
          item.createdAt = item.createdAt || new Date().toISOString();
          item.updatedAt = item.updatedAt || new Date().toISOString();
          
          const existing = await super.getById(item.id);
          if (existing) {
            // Never overwrite local pending changes during a background pull.
            if (existing.syncStatus === 'synced') await super.update(item, false);
          } else {
            await this.insert(item, false);
          }

          normalizedItems.push(item as SubCategory);
        } catch (err) {
          console.error("DB Insert/Update Error for item:", rawItem, err);
        }
      }
      // Keep local rows not returned by this pull. Local-first data must not
      // disappear because server list is stale, filtered, or eventually consistent.
      return normalizedItems;
    } catch (error) {
      console.error('Failed to fetch subcategories from API:', error);
      return [];
    }
  }
}

export const subCategoryRepository = new SubCategoryRepository();
