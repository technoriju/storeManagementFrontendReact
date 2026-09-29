import { SubUnit } from '../../types/models';
import { CrudConfig, OfflineCrudRepository, endpointFor, idOf, now } from './OfflineCrudRepository';

const config: CrudConfig<SubUnit> = {
  tableName: 'sub_units', entityType: 'sub_units', endpoint: endpointFor('SUBUNITS'),
  columns: 'id, backendId, name, parentUnitId, multiplier, status, createdAt, updatedAt, syncStatus',
  placeholders: '?, ?, ?, ?, ?, ?, ?, ?, ?',
  updateSet: 'backendId = ?, name = ?, parentUnitId = ?, multiplier = ?, status = ?, createdAt = ?, updatedAt = ?, syncStatus = ?',
  toRow: e => [e.id, e.backendId || null, e.name, e.parentUnitId || null, e.multiplier || 1, e.status || 'Active', e.createdAt || now(), e.updatedAt || now(), e.syncStatus || 'synced'],
  fromRow: r => ({
    id: Number(r.id),
    backendId: r.backendId ? Number(r.backendId) : undefined,
    name: r.name || 'Unnamed Sub Unit',
    parentUnitId: r.parentUnitId !== undefined && r.parentUnitId !== null && r.parentUnitId !== '' ? Number(r.parentUnitId) : undefined,
    multiplier: r.multiplier !== undefined && r.multiplier !== null && r.multiplier !== '' ? Number(r.multiplier) : 1,
    status: r.status || 'Active',
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    syncStatus: r.syncStatus,
  }),
  normalize: r => ({
    id: idOf(r, r.subUnitId),
    backendId: idOf(r, r.subUnitId),
    name: r.name || r.subUnitName || 'Unnamed Sub Unit',
    parentUnitId: r.parentUnitId !== undefined && r.parentUnitId !== null && r.parentUnitId !== '' ? Number(r.parentUnitId) : (r.unitId !== undefined && r.unitId !== null && r.unitId !== '' ? Number(r.unitId) : undefined),
    multiplier: r.multiplier !== undefined && r.multiplier !== null && r.multiplier !== '' ? Number(r.multiplier) : 1,
    status: r.status || 'Active',
    createdAt: r.createdAt || now(),
    updatedAt: r.updatedAt || now(),
    syncStatus: 'synced',
  }),
  payload: e => ({ name: e.name, ...(e.parentUnitId !== undefined && { parentUnitId: e.parentUnitId }), ...(e.multiplier !== undefined && { multiplier: e.multiplier }), ...(e.status !== undefined && { status: e.status }) }),
};
export const subUnitRepository = new OfflineCrudRepository(config);
