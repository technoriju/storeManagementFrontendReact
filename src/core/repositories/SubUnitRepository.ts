import { SubUnit } from '../../types/models';
import { CrudConfig, OfflineCrudRepository, endpointFor, idOf, now } from './OfflineCrudRepository';

const config: CrudConfig<SubUnit> = {
  tableName: 'sub_units', entityType: 'sub_units', endpoint: endpointFor('SUBUNITS'),
  columns: 'id, backendId, name, parentUnitId, abbreviation, multiplier, status, createdAt, updatedAt, syncStatus',
  placeholders: '?, ?, ?, ?, ?, ?, ?, ?, ?, ?',
  updateSet: 'backendId = ?, name = ?, parentUnitId = ?, abbreviation = ?, multiplier = ?, status = ?, createdAt = ?, updatedAt = ?, syncStatus = ?',
  toRow: e => [e.id, e.backendId || null, e.name, e.parentUnitId || null, e.abbreviation || null, e.multiplier || 1, e.status || 'Active', e.createdAt || now(), e.updatedAt || now(), e.syncStatus || 'synced'],
  fromRow: r => ({ id: r.id, backendId: r.backendId || undefined, name: r.name, parentUnitId: r.parentUnitId || undefined, abbreviation: r.abbreviation || undefined, multiplier: r.multiplier, status: r.status || 'Active', createdAt: r.createdAt, updatedAt: r.updatedAt, syncStatus: r.syncStatus }),
  normalize: r => ({ id: idOf(r), backendId: idOf(r), name: r.name || r.subUnitName || 'Unnamed Sub Unit', parentUnitId: r.parentUnitId || r.unitId, abbreviation: r.abbreviation || r.shortName, multiplier: r.multiplier || 1, status: r.status || 'Active', createdAt: r.createdAt || now(), updatedAt: r.updatedAt || now(), syncStatus: 'synced' }),
  payload: e => ({ name: e.name, ...(e.parentUnitId !== undefined && { parentUnitId: e.parentUnitId }), ...(e.abbreviation !== undefined && { abbreviation: e.abbreviation }), ...(e.multiplier !== undefined && { multiplier: e.multiplier }), ...(e.status !== undefined && { status: e.status }) }),
};
export const subUnitRepository = new OfflineCrudRepository(config);
