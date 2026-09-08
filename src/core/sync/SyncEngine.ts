import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useSyncStore } from './useSyncStore';
import { outboxRepo, syncMetadataRepo, tombstoneRepo, OutboxItem } from './outbox';
import { db } from '../database/db';
import { AppState, AppStateStatus } from 'react-native';

// In a real app, this would be your API client
const mockApiClient = {
  push: async (item: OutboxItem): Promise<{ success: boolean; conflict?: boolean; serverVersion?: any }> => {
    console.log('[Sync] Pushing item to server:', item.id, item.operation);
    return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 500));
  },
  pull: async (entityType: string, cursor: string | null): Promise<{ data: any[]; nextCursor: string }> => {
    console.log('[Sync] Pulling items from server for:', entityType, 'cursor:', cursor);
    return new Promise((resolve) => setTimeout(() => resolve({ data: [], nextCursor: new Date().toISOString() }), 500));
  }
};

const SYNCABLE_ENTITIES = ['users', 'categories', 'units', 'products', 'customers', 'suppliers'];

class SyncEngine {
  private isSyncing = false;
  private isOnline = false;
  private appStateSubscription: any;
  private netInfoSubscription: any;
  private syncInterval: any;

  init() {
    NetInfo.fetch().then((state) => {
      this.handleConnectivityChange(state);
    });

    this.netInfoSubscription = NetInfo.addEventListener(this.handleConnectivityChange.bind(this));
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));

    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncNow();
      }
    }, 30000);
    
    this.updatePendingCount();
  }

  destroy() {
    if (this.netInfoSubscription) this.netInfoSubscription();
    if (this.appStateSubscription) this.appStateSubscription.remove();
    if (this.syncInterval) clearInterval(this.syncInterval);
  }

  private handleConnectivityChange(state: NetInfoState) {
    this.isOnline = !!state.isConnected && !!state.isInternetReachable;
    const store = useSyncStore.getState();
    
    if (this.isOnline) {
      if (store.status === 'offline') {
        this.updateSyncStatus();
      }
      this.syncNow();
    } else {
      useSyncStore.getState().setStatus('offline');
    }
  }

  private handleAppStateChange(nextAppState: AppStateStatus) {
    if (nextAppState === 'active' && this.isOnline) {
      this.syncNow();
    }
  }
  
  private async updatePendingCount() {
    const count = await outboxRepo.getPendingCount();
    useSyncStore.getState().setPendingCount(count);
    this.updateSyncStatus();
  }

  private async updateSyncStatus() {
    const store = useSyncStore.getState();
    if (!this.isOnline) {
      store.setStatus('offline');
      return;
    }
    const count = await outboxRepo.getPendingCount();
    if (this.isSyncing) {
      store.setStatus('syncing');
    } else if (count > 0) {
      store.setStatus('pending');
    } else {
      store.setStatus('synced');
    }
  }

  async syncNow() {
    if (this.isSyncing || !this.isOnline) return;

    this.isSyncing = true;
    useSyncStore.getState().setStatus('syncing');

    try {
      await this.processOutbox();
      await this.pullServerChanges();

      useSyncStore.getState().setLastSyncedAt(new Date().toISOString());
      await this.updatePendingCount();
    } catch (error) {
      console.error('[Sync] Sync failed:', error);
      useSyncStore.getState().setStatus('failed');
    } finally {
      this.isSyncing = false;
      await this.updateSyncStatus();
    }
  }

  private async processOutbox() {
    const pendingItems = await outboxRepo.getPendingItems();
    if (pendingItems.length === 0) return;

    for (const item of pendingItems) {
      if (!this.isOnline) break;

      await outboxRepo.updateStatus(item.id, 'IN_FLIGHT');
      try {
        const response = await mockApiClient.push(item);
        
        if (response.success) {
          await outboxRepo.remove(item.id);
        } else if (response.conflict) {
          await this.applyServerChange(item.entityType, response.serverVersion);
          await outboxRepo.remove(item.id);
        }
      } catch {
        await outboxRepo.incrementRetry(item.id);
      }
    }
    await this.updatePendingCount();
  }

  private async pullServerChanges() {
    for (const entityType of SYNCABLE_ENTITIES) {
      if (!this.isOnline) break;

      const cursor = await syncMetadataRepo.getCursor(entityType);
      try {
        const { data, nextCursor } = await mockApiClient.pull(entityType, cursor);
        
        // Wait, @op-engineering/op-sqlite transaction with async inside is tricky.
        // Let's just execute them directly sequentially, or use executeBatch.
        for (const item of data) {
          await this.applyServerChange(entityType, item);
        }
        await syncMetadataRepo.setCursor(entityType, nextCursor);
      } catch (error) {
        console.error(`[Sync] Failed to pull ${entityType}:`, error);
        throw error;
      }
    }
  }

  private async applyServerChange(entityType: string, item: any) {
    if (await tombstoneRepo.isDeleted(entityType, item.id)) {
      return;
    }

    if (item._deleted) {
      await db.execute(`DELETE FROM ${entityType} WHERE id = ?`, [item.id]);
      return;
    }

    const fields = Object.keys(item).filter(k => k !== 'id' && k !== '_deleted');
    if (fields.length === 0) return;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => item[f]);

    const existing = await db.execute(`SELECT updatedAt FROM ${entityType} WHERE id = ?`, [item.id]);
    const localUpdatedAt = (existing.rows?.[0]?.updatedAt as string);

    if (!localUpdatedAt || new Date(item.updatedAt) > new Date(localUpdatedAt)) {
      await db.execute(
        `UPDATE ${entityType} SET ${setClause} WHERE id = ?`,
        [...values, item.id]
      );
      
      const changesRes = await db.execute(`SELECT changes() as c`);
      if (changesRes.rows?.[0].c === 0) {
        const placeholders = ['?', ...fields.map(() => '?')].join(', ');
        const insertFields = ['id', ...fields].join(', ');
        await db.execute(
          `INSERT INTO ${entityType} (${insertFields}) VALUES (${placeholders})`,
          [item.id, ...values]
        );
      }
    }
  }
}

export const syncEngine = new SyncEngine();
