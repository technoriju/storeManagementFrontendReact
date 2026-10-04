const storageKey = 'billing_app.sqlite.mock';
const tables = [
  'users',
  'categories',
  'sub_categories',
  'units',
  'brands',
  'sub_units',
  'unit_conversions',
  'products',
  'customers',
  'suppliers',
  'payments',
  'sales',
  'sale_items',
  'purchases',
  'purchase_items',
  'expenses',
  'settings',
  'outbox',
  'sync_metadata',
  'tombstones',
];

const load = () => {
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(storageKey) || '{}');
    const allTableKeys = Array.from(new Set([...tables, ...Object.keys(saved)]));
    return Object.fromEntries(allTableKeys.map((table) => [table, saved[table] || []]));
  } catch {
    return Object.fromEntries(tables.map((table) => [table, []]));
  }
};

const save = (data) => globalThis.localStorage?.setItem(storageKey, JSON.stringify(data));

export const open = () => {
  const data = load();
  const execute = async (query, args = []) => {
    const sql = query.replace(/\s+/g, ' ').trim();
    const tableMatch = sql.match(/(?:FROM|INTO|UPDATE|TABLE)\s+([a-z_]+)/i);
    const table = tableMatch?.[1]?.toLowerCase();
    if (!table) return { rows: [] };
    if (!data[table]) data[table] = [];
    if (/^CREATE TABLE|^ALTER TABLE/i.test(sql)) return { rows: [] };

    if (/^SELECT COUNT\(\*\)/i.test(sql)) {
      const rows = data[table].filter((row) => ['PENDING', 'FAILED'].includes(row.status));
      return { rows: [{ count: rows.length }] };
    }
    if (/^SELECT 1 FROM/i.test(sql)) {
      const row = data[table].find((item) => item.entityType === args[0] && item.entityId === args[1]);
      return { rows: row ? [{ 1: 1 }] : [] };
    }
    if (/^SELECT/i.test(sql)) {
      let rows = [...data[table]];

      if (/WHERE id = \?/i.test(sql)) {
        rows = rows.filter((row) => String(row.id) === String(args[0]));
      } else if (/WHERE key = \?/i.test(sql)) {
        rows = rows.filter((row) => row.key === args[0]);
      } else if (/WHERE entityType = \? AND entityId = \?/i.test(sql)) {
        rows = rows.filter((row) => row.entityType === args[0] && row.entityId === args[1]);
      } else if (/WHERE (?:[a-z_]+\.)?saleId = \?/i.test(sql)) {
        rows = rows.filter((row) => String(row.saleId) === String(args[0]));
      } else if (/WHERE (?:[a-z_]+\.)?purchaseId = \?/i.test(sql)) {
        rows = rows.filter((row) => String(row.purchaseId) === String(args[0]));
      } else if (/WHERE (?:[a-z_]+\.)?quotationId = \?/i.test(sql)) {
        rows = rows.filter((row) => String(row.quotationId) === String(args[0]));
      } else if (/WHERE invoiceNumber = \?/i.test(sql)) {
        rows = rows.filter(
          (row) => String(row.invoiceNumber) === String(args[0]) || (args[1] && String(row.reference) === String(args[1]))
        );
      } else if (/WHERE (?:[a-z_]+\.)?id IN/i.test(sql)) {
        const idSet = new Set(args.map(String));
        rows = rows.filter((row) => idSet.has(String(row.id)));
      } else if (/WHERE (?:[a-z_]+\.)?saleId IN/i.test(sql)) {
        const idSet = new Set(args.map(String));
        rows = rows.filter((row) => idSet.has(String(row.saleId)));
      }

      if (/ORDER BY updatedAt DESC/i.test(sql)) rows.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      if (/ORDER BY createdAt ASC/i.test(sql)) rows.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
      if (/ORDER BY (?:[a-z_]+\.)?id ASC/i.test(sql)) rows.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
      if (/ORDER BY (?:[a-z_]+\.)?id DESC/i.test(sql)) rows.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
      const limit = sql.match(/LIMIT (\d+)/i);
      if (limit) rows = rows.slice(0, Number(limit[1]));
      return { rows };
    }

    if (/^INSERT/i.test(sql)) {
      const columns = sql.match(/\(([^)]+)\)/)?.[1].split(',').map((value) => value.trim()) || [];
      const row = Object.fromEntries(columns.map((column, index) => [column, args[index]]));
      const index = data[table].findIndex((item) => String(item.id) === String(row.id));
      if (index >= 0) data[table][index] = { ...data[table][index], ...row };
      else data[table].push(row);
      save(data);
      return { rows: [] };
    }

    if (/^UPDATE/i.test(sql)) {
      if (/WHERE saleId = \?/i.test(sql)) {
        const targetSaleId = String(args[args.length - 1]);
        data[table].forEach((row) => {
          if (String(row.saleId) === targetSaleId) {
            if (/SET saleId = \?, syncStatus =/i.test(sql)) {
              row.saleId = args[0];
              row.syncStatus = 'synced';
            } else if (/SET syncStatus =/i.test(sql)) {
              row.syncStatus = 'synced';
            }
          }
        });
        save(data);
        return { rows: [] };
      }

      if (/UPDATE products SET stockQuantity = stockQuantity - \? WHERE id = \?/i.test(sql)) {
        const targetId = String(args[1]);
        const row = data[table].find((item) => String(item.id) === targetId);
        if (row) {
          row.stockQuantity = (Number(row.stockQuantity) || 0) - Number(args[0]);
          save(data);
        }
        return { rows: [] };
      }

      const id = String(args[args.length - 1]);
      const row = data[table].find((item) => String(item.id) === id);
      if (row) {
        if (/SET id = \?, syncStatus =/i.test(sql)) {
          row.id = args[0];
          row.syncStatus = 'synced';
        } else {
          const assignments = sql.match(/ SET (.+) WHERE/i)?.[1].split(',').map((value) => value.trim().split(' = ')[0]) || [];
          assignments.forEach((column, index) => {
            if (args[index] !== undefined) row[column] = args[index];
          });
        }
        save(data);
      }
      return { rows: [] };
    }

    if (/^DELETE/i.test(sql)) {
      if (/WHERE (?:[a-z_]+\.)?saleId = \?/i.test(sql)) {
        data[table] = data[table].filter((row) => String(row.saleId) !== String(args[0]));
      } else if (/WHERE (?:[a-z_]+\.)?saleId IN/i.test(sql)) {
        const idSet = new Set(args.map(String));
        data[table] = data[table].filter((row) => !idSet.has(String(row.saleId)));
      } else if (/WHERE (?:[a-z_]+\.)?purchaseId = \?/i.test(sql)) {
        data[table] = data[table].filter((row) => String(row.purchaseId) !== String(args[0]));
      } else if (/WHERE (?:[a-z_]+\.)?id IN/i.test(sql)) {
        const idSet = new Set(args.map(String));
        data[table] = data[table].filter((row) => !idSet.has(String(row.id)));
      } else if (/WHERE id = \?/i.test(sql)) {
        data[table] = data[table].filter((row) => String(row.id) !== String(args[0]));
      } else if (/WHERE entityType = \? AND entityId = \?/i.test(sql)) {
        data[table] = data[table].filter((row) => row.entityType !== args[0] || row.entityId !== args[1]);
      }
      save(data);
      return { rows: [] };
    }

    return { rows: [] };
  };
  return { execute, executeBatch: async () => ({ rowsAffected: 0 }), close: () => {}, attach: () => {}, detach: () => {} };
};

export const openAsync = async (params) => open(params);
