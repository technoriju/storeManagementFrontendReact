import { Unit } from '../../types/models';
import { CrudConfig, OfflineCrudRepository, endpointFor, idOf, now } from './OfflineCrudRepository';
const config: CrudConfig<Unit> = {
  tableName: 'units', entityType: 'units', endpoint: endpointFor('UNITS'),
  columns: 'id, backendId, name, abbreviation, createdAt, updatedAt, syncStatus', placeholders: '?, ?, ?, ?, ?, ?, ?',
  updateSet: 'backendId = ?, name = ?, abbreviation = ?, createdAt = ?, updatedAt = ?, syncStatus = ?',
  toRow: e => [e.id, (e as any).backendId || null, e.name, e.abbreviation, e.createdAt || now(), e.updatedAt || now(), e.syncStatus || 'synced'],
  fromRow: r => ({ id: r.id, backendId: r.backendId || undefined, name: r.name, abbreviation: r.abbreviation, createdAt: r.createdAt, updatedAt: r.updatedAt, syncStatus: r.syncStatus }),
  normalize: r => ({ id: idOf(r), backendId: idOf(r), name: r.name || r.unitName || 'Unnamed Unit', abbreviation: r.abbreviation || r.shortName || r.symbol || '', createdAt: r.createdAt || now(), updatedAt: r.updatedAt || now(), syncStatus: 'synced' }),
  payload: e => ({ name: e.name, abbreviation: e.abbreviation }),
};
export const unitRepository = new OfflineCrudRepository(config);
