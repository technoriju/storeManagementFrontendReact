import { db } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

export type OutboxOperation = 'CREATE' | 'UPDATE' | 'DELETE';
export type OutboxStatus = 'PENDING' | 'IN_FLIGHT' | 'FAILED';

export interface OutboxItem {
  id: string;
  entityType: string;
  entityId: string;
  operation: OutboxOperation;
  payload?: string; // JSON string
  createdAt: string;
  status: OutboxStatus;
  retryCount: number;
  lastError?: string;
}

export const outboxRepo = {
  add: async (
    entityType: string,
    entityId: string,
    operation: OutboxOperation,
    payload?: any
  ): Promise<OutboxItem> => {
    const item: OutboxItem = {
      id: uuidv4(),
      entityType,
      entityId,
      operation,
      payload: payload ? JSON.stringify(payload) : undefined,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      retryCount: 0,
    };

    await db.execute(
      `INSERT INTO outbox (id, entityType, entityId, operation, payload, createdAt, status, retryCount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.entityType,
        item.entityId,
        item.operation,
        item.payload || null,
        item.createdAt,
        item.status,
        item.retryCount,
      ]
    );

    return item;
  },

  getPendingItems: async (limit: number = 50): Promise<OutboxItem[]> => {
    const res = await db.execute(
      `SELECT * FROM outbox WHERE status IN ('PENDING', 'FAILED') ORDER BY createdAt ASC LIMIT ?`,
      [limit]
    );
    return (res.rows as unknown as OutboxItem[]) || [];
  },

  updateStatus: async (id: string, status: OutboxStatus, lastError?: string) => {
    await db.execute(
      `UPDATE outbox SET status = ?, lastError = ? WHERE id = ?`,
      [status, lastError || null, id]
    );
  },

  incrementRetry: async (id: string, maxRetries: number = 3) => {
    await db.execute(
      `UPDATE outbox SET retryCount = retryCount + 1, status = CASE WHEN retryCount + 1 >= ? THEN 'FAILED' ELSE 'PENDING' END WHERE id = ?`,
      [maxRetries, id]
    );
  },

  remove: async (id: string) => {
    await db.execute(`DELETE FROM outbox WHERE id = ?`, [id]);
  },
  
  getPendingCount: async (): Promise<number> => {
    const res = await db.execute(`SELECT COUNT(*) as count FROM outbox WHERE status IN ('PENDING', 'FAILED')`);
    return (res.rows?.[0]?.count as number) || 0;
  }
};

export const syncMetadataRepo = {
  getCursor: async (entityType: string): Promise<string | null> => {
    const res = await db.execute(`SELECT value FROM sync_metadata WHERE key = ?`, [
      `cursor_${entityType}`,
    ]);
    return (res.rows?.[0]?.value as string) || null;
  },
  setCursor: async (entityType: string, cursor: string) => {
    await db.execute(
      `INSERT OR REPLACE INTO sync_metadata (key, value, updatedAt) VALUES (?, ?, ?)`,
      [`cursor_${entityType}`, cursor, new Date().toISOString()]
    );
  },
};

export const tombstoneRepo = {
  add: async (entityType: string, entityId: string) => {
    await db.execute(
      `INSERT OR IGNORE INTO tombstones (entityType, entityId, deletedAt) VALUES (?, ?, ?)`,
      [entityType, entityId, new Date().toISOString()]
    );
  },
  isDeleted: async (entityType: string, entityId: string): Promise<boolean> => {
    const res = await db.execute(
      `SELECT 1 FROM tombstones WHERE entityType = ? AND entityId = ?`,
      [entityType, entityId]
    );
    return (res.rows?.length || 0) > 0;
  },
};
