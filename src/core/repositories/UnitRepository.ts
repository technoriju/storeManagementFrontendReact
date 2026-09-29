import { Unit } from '../../types/models';
import { CrudConfig, OfflineCrudRepository, endpointFor, idOf, now } from './OfflineCrudRepository';
const config: CrudConfig<Unit> = {
  tableName: 'units', entityType: 'units', endpoint: endpointFor('UNITS'),
  columns: 'id, backendId, name, shortName, createdAt, updatedAt, syncStatus', placeholders: '?, ?, ?, ?, ?, ?, ?',
  updateSet: 'backendId = ?, name = ?, shortName = ?, createdAt = ?, updatedAt = ?, syncStatus = ?',
  toRow: e => [e.id, (e as any).backendId || null, e.name, e.shortName, e.createdAt || now(), e.updatedAt || now(), e.syncStatus || 'synced'],
  fromRow: r => ({ id: r.id, backendId: r.backendId || undefined, name: r.name, shortName: r.shortName, createdAt: r.createdAt, updatedAt: r.updatedAt, syncStatus: r.syncStatus }),
  normalize: r => ({ id: idOf(r, r.unitId), backendId: idOf(r, r.unitId), name: r.name || r.unitName || 'Unnamed Unit', shortName: r.shortName || r.abbreviation || r.symbol || '', createdAt: r.createdAt || now(), updatedAt: r.updatedAt || now(), syncStatus: 'synced' }),
  payload: e => ({ name: e.name, shortName: e.shortName }),
};
export const unitRepository = new OfflineCrudRepository(config);
