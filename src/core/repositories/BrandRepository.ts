import { Brand } from '../../types/models';
import { CrudConfig, OfflineCrudRepository, endpointFor, idOf, now } from './OfflineCrudRepository';

const config: CrudConfig<Brand> = {
  tableName: 'brands', entityType: 'brands', endpoint: endpointFor('BRANDS'),
  columns: 'id, backendId, name, description, status, createdAt, updatedAt, syncStatus',
  placeholders: '?, ?, ?, ?, ?, ?, ?, ?',
  updateSet: 'backendId = ?, name = ?, description = ?, status = ?, createdAt = ?, updatedAt = ?, syncStatus = ?',
  toRow: e => [e.id, e.backendId || null, e.name, e.description || null, e.status || 'Active', e.createdAt || now(), e.updatedAt || now(), e.syncStatus || 'synced'],
  fromRow: r => ({ id: r.id, backendId: r.backendId || undefined, name: r.name, description: r.description || undefined, status: r.status || 'Active', createdAt: r.createdAt, updatedAt: r.updatedAt, syncStatus: r.syncStatus }),
  normalize: r => ({ id: idOf(r), backendId: idOf(r), name: r.name || r.brandName || r.title || 'Unnamed Brand', description: r.description, status: r.status || 'Active', createdAt: r.createdAt || now(), updatedAt: r.updatedAt || now(), syncStatus: 'synced' }),
  payload: e => ({ name: e.name, ...(e.description !== undefined && { description: e.description }), ...(e.status !== undefined && { status: e.status }) }),
};
export const brandRepository = new OfflineCrudRepository(config);
