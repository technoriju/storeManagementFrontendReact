import { BaseRepository } from './BaseRepository';
import { ExpenseCategory } from '../../types/models';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';
import { db } from '../database/db';
import { outboxRepo, tombstoneRepo, OutboxItem } from '../sync/outbox';

export class ExpenseCategoryRepository extends BaseRepository<ExpenseCategory> {
  protected tableName = 'expense_categories';

  private requestSync(): void {
    void import('../sync/SyncEngine').then(({ syncEngine }) => syncEngine.syncNow());
  }

  async getAll(): Promise<ExpenseCategory[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  async insert(entity: ExpenseCategory, shouldSync = true): Promise<void> {
    const localEntity: ExpenseCategory = { ...entity, syncStatus: shouldSync ? 'pending_insert' : 'synced' };
    await super.insert(localEntity, false);
    if (shouldSync) {
      await outboxRepo.add('expense_categories', localEntity.id, 'CREATE', localEntity);
      this.requestSync();
    }
  }

  async update(entity: ExpenseCategory, shouldSync = true): Promise<void> {
    const localEntity: ExpenseCategory = { ...entity, syncStatus: shouldSync ? 'pending_update' : 'synced' };
    await super.update(localEntity, false);
    if (shouldSync) {
      await outboxRepo.add('expense_categories', localEntity.id, 'UPDATE', localEntity);
      this.requestSync();
    }
  }

  async delete(itemOrId: number | ExpenseCategory, shouldSync = true): Promise<void> {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    const entity = typeof itemOrId === 'number' ? await this.getById(id) : itemOrId;
    const syncEntity = entity || ({ id, backendId: id } as ExpenseCategory);
    await db.execute(`DELETE FROM expense_categories WHERE id = ?`, [id]);
    if (shouldSync) {
      await tombstoneRepo.add('expense_categories', id);
      await outboxRepo.removeForEntity('expense_categories', id);
      if (!/^\d+$/.test(String(id))) return;
      await outboxRepo.add('expense_categories', id, 'DELETE', syncEntity);
      this.requestSync();
    }
  }

  protected getInsertColumns(): string {
    return 'id, backendId, name, description, status, createdAt, updatedAt, deletedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'backendId = ?, name = ?, description = ?, status = ?, createdAt = ?, updatedAt = ?, deletedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: ExpenseCategory): any[] {
    return [
      entity.id || Math.floor(Math.random() * -1000000000),
      entity.backendId || null,
      entity.name || 'General Expense',
      entity.description || null,
      entity.status || 'ACTIVE',
      entity.createdAt || new Date().toISOString(),
      entity.updatedAt || new Date().toISOString(),
      entity.deletedAt || null,
      entity.syncStatus || 'synced',
    ];
  }

  protected fromRow(row: any): ExpenseCategory {
    return {
      id: row.id,
      backendId: row.backendId || undefined,
      name: row.name,
      description: row.description,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      syncStatus: row.syncStatus,
    };
  }

  protected async syncWithApi(entity: ExpenseCategory, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      const { syncStatus, id, backendId, createdAt, updatedAt, deletedAt, ...apiPayload } = entity as any;
      let syncSuccess = false;

      if (operation === 'insert') {
        const response = await apiClient.post(API_ENDPOINTS.EXPENSES.CATEGORIES, apiPayload);
        const serverId = response.data?.id || (response.data?.data && response.data.data.id);
        if (serverId && serverId.toString() !== entity.id.toString()) {
          await db.execute(
            `UPDATE expense_categories SET id = ?, syncStatus = 'synced' WHERE id = ?`,
            [serverId.toString(), entity.id]
          );
          syncSuccess = true;
        } else if (response.status >= 200 && response.status < 300) {
          syncSuccess = true;
        }
      } else if (operation === 'update') {
        const targetId = entity.backendId || entity.id;
        const response = await apiClient.patch(API_ENDPOINTS.EXPENSES.CATEGORY_BY_ID(targetId), apiPayload);
        if (response.status >= 200 && response.status < 300) syncSuccess = true;
      } else if (operation === 'delete') {
        const targetId = entity.backendId || entity.id;
        const response = await apiClient.delete(API_ENDPOINTS.EXPENSES.CATEGORY_BY_ID(targetId));
        if (response.status >= 200 && response.status < 300) syncSuccess = true;
      }

      if (operation !== 'delete' && syncSuccess && entity.syncStatus !== 'synced') {
        entity.syncStatus = 'synced';
        await this.update(entity, false);
      }
    } catch (error: any) {
      const responseStatus = error?.response?.status ?? error?.statusCode;
      if (operation === 'delete' && responseStatus >= 400 && responseStatus < 500) {
        return;
      }
      console.error(`Failed to sync expense category ${entity.id}:`, error);
      throw error;
    }
  }

  async syncOutboxItem(item: OutboxItem): Promise<void> {
    if (item.operation !== 'DELETE' && (await tombstoneRepo.isDeleted('expense_categories', item.entityId))) {
      return;
    }
    const entity = item.payload ? (JSON.parse(item.payload) as ExpenseCategory) : await this.getById(item.entityId);
    if (item.operation === 'DELETE') {
      if (!/^\d+$/.test(String(item.entityId))) return;
      await this.syncWithApi(entity || ({ id: item.entityId } as ExpenseCategory), 'delete');
      return;
    }
    if (!entity) throw new Error(`Expense category ${item.entityId} not found`);
    await this.syncWithApi(entity, item.operation === 'CREATE' ? 'insert' : 'update');
  }

  public async fetchFromApi(): Promise<ExpenseCategory[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.EXPENSES.CATEGORIES);
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

      const items = findItems(response.data);
      const normalizedItems: ExpenseCategory[] = [];

      for (const item of items) {
        const id = item.id;
        if (!id) continue;
        const normalized: ExpenseCategory = {
          id: Number(id),
          backendId: Number(id),
          name: item.name,
          description: item.description || null,
          status: item.status || 'ACTIVE',
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
          deletedAt: item.deletedAt || null,
          syncStatus: 'synced',
        };
        normalizedItems.push(normalized);

        const existing = await this.getById(Number(id));
        if (existing) {
          if (existing.syncStatus === 'synced') {
            await super.update(normalized, false);
          }
        } else {
          await super.insert(normalized, false);
        }
      }

      // Cleanup local deleted
      const allLocal = await super.getAll();
      const serverIds = new Set(items.map((i) => String(i.id)));
      for (const local of allLocal) {
        if (local.syncStatus === 'synced' && !serverIds.has(String(local.id))) {
          await db.execute(`DELETE FROM expense_categories WHERE id = ?`, [local.id]);
        }
      }

      return normalizedItems;
    } catch (error) {
      console.warn('Failed to fetch expense categories from API, using local DB:', error);
      return this.getAll();
    }
  }
}

export const expenseCategoryRepository = new ExpenseCategoryRepository();
