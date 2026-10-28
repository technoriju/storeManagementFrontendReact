import { BaseRepository } from './BaseRepository';
import { BankAccount } from '../../types/models';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';
import { db } from '../database/db';
import { outboxRepo, tombstoneRepo, OutboxItem } from '../sync/outbox';

export class BankAccountRepository extends BaseRepository<BankAccount> {
  protected tableName = 'bank_accounts';

  private requestSync(): void {
    void import('../sync/SyncEngine').then(({ syncEngine }) => syncEngine.syncNow());
  }

  async getAll(): Promise<BankAccount[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (a.accountName || '').localeCompare(b.accountName || ''));
  }

  async insert(entity: BankAccount, shouldSync = true): Promise<void> {
    const localEntity: BankAccount = { ...entity, syncStatus: shouldSync ? 'pending_insert' : 'synced' };
    await super.insert(localEntity, false);
    if (shouldSync) {
      await outboxRepo.add('bank_accounts', localEntity.id, 'CREATE', localEntity);
      this.requestSync();
    }
  }

  async update(entity: BankAccount, shouldSync = true): Promise<void> {
    const localEntity: BankAccount = { ...entity, syncStatus: shouldSync ? 'pending_update' : 'synced' };
    await super.update(localEntity, false);
    if (shouldSync) {
      await outboxRepo.add('bank_accounts', localEntity.id, 'UPDATE', localEntity);
      this.requestSync();
    }
  }

  async delete(itemOrId: number | BankAccount, shouldSync = true): Promise<void> {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    const entity = typeof itemOrId === 'number' ? await this.getById(id) : itemOrId;
    const syncEntity = entity || ({ id, backendId: id } as BankAccount);
    await db.execute(`DELETE FROM bank_accounts WHERE id = ?`, [id]);
    if (shouldSync) {
      await tombstoneRepo.add('bank_accounts', id);
      await outboxRepo.removeForEntity('bank_accounts', id);
      if (!/^\d+$/.test(String(id))) return;
      await outboxRepo.add('bank_accounts', id, 'DELETE', syncEntity);
      this.requestSync();
    }
  }

  protected getInsertColumns(): string {
    return 'id, backendId, accountName, accountNumber, bankName, branchName, ifscCode, accountType, openingBalance, currentBalance, status, createdAt, updatedAt, deletedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'backendId = ?, accountName = ?, accountNumber = ?, bankName = ?, branchName = ?, ifscCode = ?, accountType = ?, openingBalance = ?, currentBalance = ?, status = ?, createdAt = ?, updatedAt = ?, deletedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: BankAccount): any[] {
    return [
      entity.id || Math.floor(Math.random() * -1000000000),
      entity.backendId || null,
      entity.accountName || 'Bank Account',
      entity.accountNumber || null,
      entity.bankName || null,
      entity.branchName || null,
      entity.ifscCode || null,
      entity.accountType || 'BANK',
      Number(entity.openingBalance || 0),
      Number(entity.currentBalance || entity.openingBalance || 0),
      entity.status || 'ACTIVE',
      entity.createdAt || new Date().toISOString(),
      entity.updatedAt || new Date().toISOString(),
      entity.deletedAt || null,
      entity.syncStatus || 'synced',
    ];
  }

  protected fromRow(row: any): BankAccount {
    return {
      id: row.id,
      backendId: row.backendId || undefined,
      accountName: row.accountName,
      accountNumber: row.accountNumber,
      bankName: row.bankName,
      branchName: row.branchName,
      ifscCode: row.ifscCode,
      accountType: row.accountType,
      openingBalance: Number(row.openingBalance || 0),
      currentBalance: Number(row.currentBalance || 0),
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      syncStatus: row.syncStatus,
    };
  }

  protected async syncWithApi(entity: BankAccount, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      const { syncStatus, id, backendId, createdAt, updatedAt, deletedAt, ...apiPayload } = entity as any;
      let syncSuccess = false;

      if (operation === 'insert') {
        const response = await apiClient.post(API_ENDPOINTS.BANKING.ACCOUNTS, apiPayload);
        const serverId = response.data?.id || (response.data?.data && response.data.data.id);
        if (serverId && serverId.toString() !== entity.id.toString()) {
          await db.execute(
            `UPDATE bank_accounts SET id = ?, syncStatus = 'synced' WHERE id = ?`,
            [serverId.toString(), entity.id]
          );
          syncSuccess = true;
        } else if (response.status >= 200 && response.status < 300) {
          syncSuccess = true;
        }
      } else if (operation === 'update') {
        const targetId = entity.backendId || entity.id;
        const response = await apiClient.patch(API_ENDPOINTS.BANKING.ACCOUNT_BY_ID(targetId), apiPayload);
        if (response.status >= 200 && response.status < 300) syncSuccess = true;
      } else if (operation === 'delete') {
        const targetId = entity.backendId || entity.id;
        const response = await apiClient.delete(API_ENDPOINTS.BANKING.ACCOUNT_BY_ID(targetId));
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
      console.error(`Failed to sync bank account ${entity.id}:`, error);
      throw error;
    }
  }

  async syncOutboxItem(item: OutboxItem): Promise<void> {
    if (item.operation !== 'DELETE' && (await tombstoneRepo.isDeleted('bank_accounts', item.entityId))) {
      return;
    }
    const entity = item.payload ? (JSON.parse(item.payload) as BankAccount) : await this.getById(item.entityId);
    if (item.operation === 'DELETE') {
      if (!/^\d+$/.test(String(item.entityId))) return;
      await this.syncWithApi(entity || ({ id: item.entityId } as BankAccount), 'delete');
      return;
    }
    if (!entity) throw new Error(`Bank account ${item.entityId} not found`);
    await this.syncWithApi(entity, item.operation === 'CREATE' ? 'insert' : 'update');
  }

  public async fetchFromApi(): Promise<BankAccount[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.BANKING.ACCOUNTS);
      const findItems = (payload: any): any[] => {
        if (Array.isArray(payload)) return payload;
        if (!payload || typeof payload !== 'object') return [];
        for (const key of ['accounts', 'data', 'items', 'results']) {
          const found = findItems(payload[key]);
          if (found.length > 0) return found;
        }
        for (const value of Object.values(payload)) {
          if (Array.isArray(value)) return value;
        }
        return [];
      };

      const items = findItems(response.data);
      const normalizedItems: BankAccount[] = [];

      for (const item of items) {
        const id = item.id;
        if (!id) continue;
        const normalized: BankAccount = {
          id: Number(id),
          backendId: Number(id),
          accountName: item.accountName,
          accountNumber: item.accountNumber || null,
          bankName: item.bankName || null,
          branchName: item.branchName || null,
          ifscCode: item.ifscCode || null,
          accountType: item.accountType || 'BANK',
          openingBalance: Number(item.openingBalance || 0),
          currentBalance: Number(item.currentBalance || item.openingBalance || 0),
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
          await db.execute(`DELETE FROM bank_accounts WHERE id = ?`, [local.id]);
        }
      }

      return normalizedItems;
    } catch (error) {
      console.warn('Failed to fetch bank accounts from API, using local DB:', error);
      return this.getAll();
    }
  }
}

export const bankAccountRepository = new BankAccountRepository();
