import { db } from '../database/db';


export type OutboxOperation = 'CREATE' | 'UPDATE' | 'DELETE';
export type OutboxStatus = 'PENDING' | 'IN_FLIGHT' | 'FAILED';

export interface OutboxItem {
  id: number;
  entityType: string;
  entityId: number;
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
    entityId: number,
    operation: OutboxOperation,
    payload?: any
  ): Promise<OutboxItem> => {
    const item: OutboxItem = {
      id: Date.now(),
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

  getAll: async (): Promise<OutboxItem[]> => {
    const res = await db.execute(`SELECT * FROM outbox ORDER BY createdAt ASC`);
    return (res.rows as unknown as OutboxItem[]) || [];
  },

  updateStatus: async (id: number, status: OutboxStatus, lastError?: string) => {
    await db.execute(
      `UPDATE outbox SET status = ?, lastError = ? WHERE id = ?`,
      [status, lastError || null, id]
    );
  },

  incrementRetry: async (id: number, maxRetries: number = 3) => {
    await db.execute(
      `UPDATE outbox SET retryCount = retryCount + 1, status = CASE WHEN retryCount + 1 >= ? THEN 'FAILED' ELSE 'PENDING' END WHERE id = ?`,
      [maxRetries, id]
    );
  },

  remove: async (id: number) => {
    await db.execute(`DELETE FROM outbox WHERE id = ?`, [id]);
  },

  removeForEntity: async (entityType: string, entityId: number) => {
    await db.execute(
      `DELETE FROM outbox WHERE entityType = ? AND entityId = ?`,
      [entityType, entityId]
    );
  },

  rebaseEntity: async (entityType: string, oldid: number, newid: number, backendid: number) => {
    const res = await db.execute(
      `SELECT id, payload FROM outbox WHERE entityType = ? AND entityId = ?`,
      [entityType, oldId],
    );
    const rows = (res.rows as any[]) || [];
    for (const row of rows) {
      let payload: string | null = row.payload || null;
      if (payload) {
        try {
          const value = JSON.parse(payload);
          value.id = newId;
          value.backendId = backendId;
          payload = JSON.stringify(value);
        } catch {
          // Keep invalid legacy payload unchanged.
        }
      }
      await db.execute(
        `UPDATE outbox SET entityId = ?, payload = ? WHERE id = ?`,
        [newId, payload, row.id],
      );
    }
  },

  removeDeletedInvalidIds: async (entityType: string) => {
    await db.execute(
      `DELETE FROM outbox
       WHERE entityType = ?
         AND entityId GLOB '*[^0-9]*'
         AND NOT EXISTS (
           SELECT 1 FROM ${entityType} c
           WHERE c.id = outbox.entityId
         )`,
      [entityType]
    );
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
  add: async (entityType: string, entityId: number) => {
    await db.execute(
      `INSERT OR IGNORE INTO tombstones (entityType, entityId, deletedAt) VALUES (?, ?, ?)`,
      [entityType, entityId, new Date().toISOString()]
    );
  },
  isDeleted: async (entityType: string, entityId: number): Promise<boolean> => {
    const res = await db.execute(
      `SELECT 1 FROM tombstones WHERE entityType = ? AND entityId = ?`,
      [entityType, entityId]
    );
    return (res.rows?.length || 0) > 0;
  },
};


