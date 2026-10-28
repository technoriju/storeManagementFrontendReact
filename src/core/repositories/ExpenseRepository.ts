import { BaseRepository } from './BaseRepository';
import { Expense } from '../../types/models';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';
import { db } from '../database/db';
import { outboxRepo, tombstoneRepo, OutboxItem } from '../sync/outbox';

export class ExpenseRepository extends BaseRepository<Expense> {
  protected tableName = 'expenses';

  private requestSync(): void {
    void import('../sync/SyncEngine').then(({ syncEngine }) => syncEngine.syncNow());
  }

  async getAll(): Promise<Expense[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')));
  }

  async insert(entity: Expense, shouldSync = true): Promise<void> {
    const localEntity: Expense = { ...entity, syncStatus: shouldSync ? 'pending_insert' : 'synced' };
    await super.insert(localEntity, false);
    if (shouldSync) {
      await outboxRepo.add('expenses', localEntity.id, 'CREATE', localEntity);
      this.requestSync();
    }
  }

  async update(entity: Expense, shouldSync = true): Promise<void> {
    const localEntity: Expense = { ...entity, syncStatus: shouldSync ? 'pending_update' : 'synced' };
    await super.update(localEntity, false);
    if (shouldSync) {
      await outboxRepo.add('expenses', localEntity.id, 'UPDATE', localEntity);
      this.requestSync();
    }
  }

  async delete(itemOrId: number | Expense, shouldSync = true): Promise<void> {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    const entity = typeof itemOrId === 'number' ? await this.getById(id) : itemOrId;
    const syncEntity = entity || ({ id, backendId: id } as Expense);
    await db.execute(`DELETE FROM expenses WHERE id = ?`, [id]);
    if (shouldSync) {
      await tombstoneRepo.add('expenses', id);
      await outboxRepo.removeForEntity('expenses', id);
      if (!/^\d+$/.test(String(id))) return;
      await outboxRepo.add('expenses', id, 'DELETE', syncEntity);
      this.requestSync();
    }
  }

  protected getInsertColumns(): string {
    return 'id, backendId, category, amount, date, description, reference, createdAt, updatedAt, deletedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'backendId = ?, category = ?, amount = ?, date = ?, description = ?, reference = ?, createdAt = ?, updatedAt = ?, deletedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Expense): any[] {
    return [
      entity.id || Math.floor(Math.random() * -1000000000),
      entity.backendId || null,
      entity.category || 'General',
      Number(entity.amount) || 0,
      entity.date || new Date().toISOString().slice(0, 10),
      entity.description || null,
      entity.reference || null,
      entity.createdAt || new Date().toISOString(),
      entity.updatedAt || new Date().toISOString(),
      entity.deletedAt || null,
      entity.syncStatus || 'synced',
    ];
  }

  protected fromRow(row: any): Expense {
    return {
      id: row.id,
      backendId: row.backendId || undefined,
      category: row.category,
      amount: Number(row.amount),
      date: row.date,
      description: row.description,
      reference: row.reference,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      syncStatus: row.syncStatus,
    };
  }

  protected async syncWithApi(entity: Expense, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      const { syncStatus, id, backendId, createdAt, updatedAt, deletedAt, date, ...rest } = entity as any;
      const apiPayload = {
        ...rest,
        amount: Number(entity.amount),
        expenseDate: date ? new Date(date).toISOString() : new Date().toISOString(),
      };

      let syncSuccess = false;

      if (operation === 'insert') {
        const response = await apiClient.post(API_ENDPOINTS.EXPENSES.BASE, apiPayload);
        const serverId = response.data?.id || (response.data?.data && response.data.data.id);
        if (serverId && serverId.toString() !== entity.id.toString()) {
          await db.execute(
            `UPDATE expenses SET id = ?, syncStatus = 'synced' WHERE id = ?`,
            [serverId.toString(), entity.id]
          );
          syncSuccess = true;
        } else if (response.status >= 200 && response.status < 300) {
          syncSuccess = true;
        }
      } else if (operation === 'update') {
        const targetId = entity.backendId || entity.id;
        const response = await apiClient.patch(API_ENDPOINTS.EXPENSES.BY_ID(targetId), apiPayload);
        if (response.status >= 200 && response.status < 300) syncSuccess = true;
      } else if (operation === 'delete') {
        const targetId = entity.backendId || entity.id;
        const response = await apiClient.delete(API_ENDPOINTS.EXPENSES.BY_ID(targetId));
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
      console.error(`Failed to sync expense ${entity.id}:`, error);
      throw error;
    }
  }

  async syncOutboxItem(item: OutboxItem): Promise<void> {
    if (item.operation !== 'DELETE' && (await tombstoneRepo.isDeleted('expenses', item.entityId))) {
      return;
    }
    const entity = item.payload ? (JSON.parse(item.payload) as Expense) : await this.getById(item.entityId);
    if (item.operation === 'DELETE') {
      if (!/^\d+$/.test(String(item.entityId))) return;
      await this.syncWithApi(entity || ({ id: item.entityId } as Expense), 'delete');
      return;
    }
    if (!entity) throw new Error(`Expense ${item.entityId} not found`);
    await this.syncWithApi(entity, item.operation === 'CREATE' ? 'insert' : 'update');
  }

  public async fetchFromApi(): Promise<Expense[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.EXPENSES.BASE);
      const findItems = (payload: any): any[] => {
        if (Array.isArray(payload)) return payload;
        if (!payload || typeof payload !== 'object') return [];
        for (const key of ['expenses', 'data', 'items', 'results', 'rows']) {
          const found = findItems(payload[key]);
          if (found.length > 0) return found;
        }
        for (const value of Object.values(payload)) {
          if (Array.isArray(value)) return value;
        }
        return [];
      };

      const items = findItems(response.data);
      const normalizedItems: Expense[] = [];

      for (const item of items) {
        const id = item.id;
        if (!id) continue;
        const rawDate = item.expenseDate || item.date;
        const dateStr = rawDate ? String(rawDate).slice(0, 10) : new Date().toISOString().slice(0, 10);

        const normalized: Expense = {
          id: Number(id),
          backendId: Number(id),
          category: item.category || 'General',
          amount: Number(item.amount) || 0,
          date: dateStr,
          description: item.description || null,
          reference: item.reference || null,
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
          await db.execute(`DELETE FROM expenses WHERE id = ?`, [local.id]);
        }
      }

      return normalizedItems;
    } catch (error) {
      console.warn('Failed to fetch expenses from API, using local DB:', error);
      return this.getAll();
    }
  }
}

export const expenseRepository = new ExpenseRepository();
