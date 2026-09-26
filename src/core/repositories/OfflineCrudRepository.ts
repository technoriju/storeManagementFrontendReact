import { BaseRepository } from './BaseRepository';
import { apiClient } from '../api/api-client';
import { db } from '../database/db';
import { API_ENDPOINTS } from '../api/api-urls';
import { outboxRepo, tombstoneRepo, OutboxItem } from '../sync/outbox';
import { BaseEntity } from '../../types/models';

type Operation = 'insert' | 'update' | 'delete';

export type CrudConfig<T extends BaseEntity> = {
  tableName: string;
  entityType: string;
  endpoint: { BASE: string; BY_ID: (id: number | number) => string };
  columns: string;
  placeholders: string;
  updateSet: string;
  toRow: (entity: T) => any[];
  fromRow: (row: any) => T;
  normalize: (item: any) => T;
  payload: (entity: T) => Record<string, unknown>;
};

export class OfflineCrudRepository<T extends BaseEntity> extends BaseRepository<T> {
  protected tableName: string;
  private config: CrudConfig<T>;

  constructor(config: CrudConfig<T>) {
    super();
    this.config = config;
    this.tableName = config.tableName;
  }

  protected getInsertColumns() { return this.config.columns; }
  protected getInsertPlaceholders() { return this.config.placeholders; }
  protected getUpdateSet() { return this.config.updateSet; }
  protected toRow(entity: T) { return this.config.toRow(entity); }
  protected fromRow(row: any) { return this.config.fromRow(row); }

  async getAll(): Promise<T[]> {
    return (await super.getAll()).filter(item => !item.deletedAt)
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  }

  async insert(entity: T, shouldSync = true) {
    const local = { ...entity, syncStatus: shouldSync ? 'pending_insert' : 'synced' } as T;
    await super.insert(local, false);
    if (shouldSync) {
      await outboxRepo.add(this.config.entityType, local.id, 'CREATE', local);
      this.requestSync();
    }
  }

  async update(entity: T, shouldSync = true) {
    const local = { ...entity, syncStatus: shouldSync ? 'pending_update' : 'synced' } as T;
    await super.update(local, false);
    if (shouldSync) {
      await outboxRepo.add(this.config.entityType, local.id, 'UPDATE', local);
      this.requestSync();
    }
  }

  async delete(id: number, shouldSync = true) {
    const entity = await this.getById(id);
    if (!entity) return;
    await db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    if (!shouldSync) return;
    await tombstoneRepo.add(this.config.entityType, id);
    await outboxRepo.removeForEntity(this.config.entityType, id);
    if (/^\d+$/.test(Number((entity as any).backendId || entity.id))) {
      await outboxRepo.add(this.config.entityType, id, 'DELETE', entity);
      this.requestSync();
    }
  }

  protected async syncWithApi(entity: T, operation: Operation) {
    const payload = this.config.payload(entity);
    const serverId = Number((entity as any).backendId || entity.id);
    let response: any;
    if (operation === 'insert') response = await apiClient.post(this.config.endpoint.BASE, payload);
    if (operation === 'update') response = await apiClient.patch(this.config.endpoint.BY_ID(serverId), payload);
    if (operation === 'delete') response = await apiClient.delete(this.config.endpoint.BY_ID(serverId));

    if (operation === 'insert') {
      const body = response?.data?.data || response?.data || {};
      const returnedId = body.id || body._id || body[`${this.config.tableName.slice(0, -1)}Id`];
      if (returnedId && Number(returnedId) !== String(entity.id)) {
        await db.execute(`UPDATE ${this.tableName} SET id = ?, backendId = ?, syncStatus = 'synced' WHERE id = ?`, [Number(returnedId), Number(returnedId), entity.id]);
        return;
      }
    }
    if (operation !== 'delete') await super.update({ ...entity, syncStatus: 'synced' } as T, false);
  }

  async syncOutboxItem(item: OutboxItem) {
    if (item.operation !== 'DELETE' && await tombstoneRepo.isDeleted(this.config.entityType, item.entityId)) return;
    if (item.operation === 'DELETE' && !/^\d+$/.test(String(item.entityId))) return;
    const entity = item.payload ? JSON.parse(item.payload) as T : await this.getById(item.entityId);
    if (!entity && item.operation !== 'DELETE') throw new Error(`${this.config.entityType} ${item.entityId} not found`);
    await this.syncWithApi(entity || ({ id: item.entityId } as T), item.operation === 'CREATE' ? 'insert' : item.operation === 'UPDATE' ? 'update' : 'delete');
  }

  async fetchFromApi(): Promise<T[]> {
    const response = await apiClient.get(this.config.endpoint.BASE);
    const findItems = (value: any): any[] => {
      if (Array.isArray(value)) return value;
      if (!value || typeof value !== 'object') return [];
      for (const key of ['data', 'items', 'results', 'rows', 'records']) {
        const found = findItems(value[key]);
        if (found.length) return found;
      }
      return [];
    };
    const normalized: T[] = [];
    for (const raw of findItems(response.data)) {
      const item = this.config.normalize(raw);
      const existing = await super.getById(item.id);
      if (existing) await super.update(item, false);
      else await this.insert(item, false);
      normalized.push(item);
    }
    const ids = normalized.map(item => item.id);
    if (ids.length) await db.execute(`DELETE FROM ${this.tableName} WHERE syncStatus = 'synced' AND id NOT IN (${ids.map(() => '?').join(',')})`, ids);
    else await db.execute(`DELETE FROM ${this.tableName} WHERE syncStatus = 'synced'`);
    return normalized;
  }

  private requestSync() {
    void import('../sync/SyncEngine').then(({ syncEngine }) => syncEngine.syncNow());
  }
}

export const now = () => new Date().toISOString();
export const idOf = (item: any, fallback?: number) => Number(item.id || item._id || item.backendId || fallback || Math.floor(Math.random() * -1000000000));
export const endpointFor = (key: keyof typeof API_ENDPOINTS) => API_ENDPOINTS[key] as { BASE: string; BY_ID: (id: number | number) => string };

