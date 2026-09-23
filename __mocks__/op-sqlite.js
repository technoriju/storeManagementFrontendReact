const storageKey = 'billing_app.sqlite.mock';
const tables = ['users', 'categories', 'units', 'brands', 'products', 'customers', 'suppliers', 'payments', 'sales', 'sale_items', 'purchases', 'purchase_items', 'expenses', 'settings', 'outbox', 'sync_metadata', 'tombstones'];

const load = () => {
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(storageKey) || '{}');
    return Object.fromEntries(tables.map((table) => [table, saved[table] || []]));
  } catch {
    return Object.fromEntries(tables.map((table) => [table, []]));
  }
};

const save = (data) => globalThis.localStorage?.setItem(storageKey, JSON.stringify(data));

export const open = () => {
  const data = load();
  const execute = async (query, args = []) => {
    const sql = query.replace(/\s+/g, ' ').trim();
    const tableMatch = sql.match(/(?:FROM|INTO|UPDATE|TABLE) ([a-z_]+)/i);
    const table = tableMatch?.[1]?.toLowerCase();
    if (!table || !data[table]) return { rows: [] };
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
      if (/WHERE id = \?/i.test(sql)) rows = rows.filter((row) => String(row.id) === String(args[0]));
      if (/WHERE key = \?/i.test(sql)) rows = rows.filter((row) => row.key === args[0]);
      if (/WHERE entityType = \? AND entityId = \?/i.test(sql)) rows = rows.filter((row) => row.entityType === args[0] && row.entityId === args[1]);
      if (/ORDER BY updatedAt DESC/i.test(sql)) rows.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      if (/ORDER BY createdAt ASC/i.test(sql)) rows.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
      const limit = sql.match(/LIMIT (\d+)/i);
      if (limit) rows = rows.slice(0, Number(limit[1]));
      return { rows };
    }

    if (/^INSERT/i.test(sql)) {
      const columns = sql.match(/\(([^)]+)\)/)?.[1].split(',').map((value) => value.trim()) || [];
      const row = Object.fromEntries(columns.map((column, index) => [column, args[index]]));
      const index = data[table].findIndex((item) => item.id === row.id);
      if (index >= 0 && /OR REPLACE/i.test(sql)) data[table][index] = { ...data[table][index], ...row };
      else data[table].push(row);
      save(data);
      return { rows: [] };
    }
    if (/^UPDATE/i.test(sql)) {
      const id = args[args.length - 1];
      const row = data[table].find((item) => String(item.id) === String(id));
      if (row) {
        const assignments = sql.match(/ SET (.+) WHERE/i)?.[1].split(',').map((value) => value.trim().split(' = ')[0]) || [];
        assignments.forEach((column, index) => { row[column] = args[index]; });
        save(data);
      }
      return { rows: [] };
    }
    if (/^DELETE/i.test(sql)) {
      if (/WHERE id = \?/i.test(sql)) data[table] = data[table].filter((row) => String(row.id) !== String(args[0]));
      else if (/WHERE entityType = \? AND entityId = \?/i.test(sql)) data[table] = data[table].filter((row) => row.entityType !== args[0] || row.entityId !== args[1]);
      save(data);
      return { rows: [] };
    }
    return { rows: [] };
  };
  return { execute, executeBatch: async () => ({ rowsAffected: 0 }), close: () => {}, attach: () => {}, detach: () => {} };
};

export const openAsync = async (params) => open(params);
