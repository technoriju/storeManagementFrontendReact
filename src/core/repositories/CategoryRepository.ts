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

  async createDirect(data: Partial<Category>): Promise<Category> {
    const apiPayload = {
      name: data.name,
      ...(data.description !== undefined && { description: data.description }),
      ...(data.parentId !== undefined && { parentId: data.parentId }),
    };
    try {
      const response = await apiClient.post(API_ENDPOINTS.CATEGORIES.BASE, apiPayload);
      const serverData = response.data?.data || response.data || {};
      const serverId = Number(serverData?.id || response.data?.id || data.id || Date.now());

      const entity: Category = {
        ...data,
        ...serverData,
        id: serverId,
        backendId: serverId,
        name: serverData.name || data.name || '',
        description: serverData.description || data.description,
        createdAt: serverData.createdAt || new Date().toISOString(),
        updatedAt: serverData.updatedAt || new Date().toISOString(),
        syncStatus: 'synced',
      };
      await super.insert(entity, false);
      return entity;
    } catch (error: any) {
      if (error?.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }
      if (!error?.response || error.code === 'ERR_NETWORK') {
        const fallbackId = data.id || Math.floor(Math.random() * -1000000000);
        const fallbackEntity: Category = {
          ...data,
          id: fallbackId,
          name: data.name || '',
          description: data.description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: 'pending_insert',
        };
        await this.insert(fallbackEntity, true);
        return fallbackEntity;
      }
      throw error;
    }
  }

  async updateDirect(id: number, data: Partial<Category>): Promise<Category> {
    const existing = await this.getById(id);
    const serverId = Number((existing as any)?.backendId || id);
    const apiPayload = {
      name: data.name ?? existing?.name,
      description: data.description ?? existing?.description,
      ...(data.parentId !== undefined && { parentId: data.parentId }),
    };
    try {
      const response = await apiClient.patch(API_ENDPOINTS.CATEGORIES.BY_ID(serverId), apiPayload);
      const serverData = response.data?.data || response.data || {};
      const updated: Category = {
        ...(existing || {}),
        ...data,
        ...serverData,
        id,
        backendId: serverId,
        syncStatus: 'synced',
        updatedAt: new Date().toISOString(),
      };
      await super.update(updated, false);
      return updated;
    } catch (error: any) {
      if (error?.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }
      if (!error?.response || error.code === 'ERR_NETWORK') {
        const fallback: Category = {
          ...(existing || {}),
          ...data,
          id,
          syncStatus: 'pending_update',
          updatedAt: new Date().toISOString(),
        } as Category;
        await this.update(fallback, true);
        return fallback;
      }
      throw error;
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

  async delete(categoryOrId: number | Category, shouldSync = true): Promise<void> {
    const id = typeof categoryOrId === 'number' ? categoryOrId : categoryOrId.id;
    const entity = typeof categoryOrId === 'number'
      ? await this.getById(id)
      : categoryOrId;
    const syncEntity = entity || ({ id, backendId: id } as Category);
    await db.execute(`DELETE FROM categories WHERE id = ?`, [id]);
    if (shouldSync) {
      await tombstoneRepo.add('categories', id);
      // Cancel older CREATE/UPDATE jobs for deleted local records.
      await outboxRepo.removeForEntity('categories', id);
      if (!/^\d+$/.test(String(id))) return;
      await outboxRepo.add('categories', id, 'DELETE', syncEntity);
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
      entity.id || Math.floor(Math.random() * -1000000000),
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
        for (const value of Object.values(payload)) {
          if (Array.isArray(value)) return value;
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
          item.backendId = Number(item.backendId || item.serverId || item.categoryId || item._id || item.id || '');
          item.id = Number(item.id || item.backendId || Math.floor(Math.random() * -1000000000));
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
            const duplicateResult = await db.execute(
              `SELECT id FROM categories WHERE syncStatus = 'pending_insert' AND name = ? AND id != ?`,
              [item.name, item.id],
            );
            const duplicateRow = Array.isArray(duplicateResult.rows) ? duplicateResult.rows[0] : undefined;
            if (duplicateRow) {
              await db.execute(`DELETE FROM categories WHERE id = ?`, [duplicateRow.id]);
              await outboxRepo.removeForEntity('categories', Number(duplicateRow.id));
            }
          } else {
            const pendingResult = await db.execute(
              `SELECT id FROM categories WHERE syncStatus = 'pending_insert' AND name = ? LIMIT 1`,
              [item.name],
            );
            const pendingRow = Array.isArray(pendingResult.rows) ? pendingResult.rows[0] : undefined;
            if (pendingRow && String(pendingRow.id) !== String(item.id)) {
              await db.execute(`DELETE FROM categories WHERE id = ?`, [item.id]);
              await db.execute(
                `UPDATE categories SET id = ?, backendId = ?, syncStatus = 'synced' WHERE id = ?`,
                [item.id, item.id, pendingRow.id],
              );
              await outboxRepo.rebaseEntity('categories', Number(pendingRow.id), Number(item.id), Number(item.id));
            } else {
              await this.insert(item, false);
            }
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



