import { Supplier } from '../../types/models';
import { CrudConfig, OfflineCrudRepository, endpointFor, idOf, now } from './OfflineCrudRepository';
const config: CrudConfig<Supplier> = {
  tableName: 'suppliers', entityType: 'suppliers', endpoint: endpointFor('SUPPLIERS'),
  columns: 'id, backendId, name, contactName, email, phone, address, outstandingBalance, createdAt, updatedAt, syncStatus', placeholders: '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?',
  updateSet: 'backendId = ?, name = ?, contactName = ?, email = ?, phone = ?, address = ?, outstandingBalance = ?, createdAt = ?, updatedAt = ?, syncStatus = ?',
  toRow: e => [e.id, (e as any).backendId || null, e.name, e.contactName || null, e.email || null, e.phone || null, e.address || null, e.outstandingBalance || 0, e.createdAt || now(), e.updatedAt || now(), e.syncStatus || 'synced'],
  fromRow: r => ({ id: r.id, backendId: r.backendId || undefined, name: r.name, contactName: r.contactName || undefined, email: r.email || undefined, phone: r.phone || undefined, address: r.address || undefined, outstandingBalance: r.outstandingBalance || 0, createdAt: r.createdAt, updatedAt: r.updatedAt, syncStatus: r.syncStatus }),
  normalize: r => ({ id: idOf(r), backendId: idOf(r), name: r.name || r.supplierName || 'Unnamed Supplier', contactName: r.contactName, email: r.email, phone: r.phone, address: r.address, outstandingBalance: Number(r.outstandingBalance || 0), createdAt: r.createdAt || now(), updatedAt: r.updatedAt || now(), syncStatus: 'synced' }),
  payload: e => ({ name: e.name, contactName: e.contactName, email: e.email, phone: e.phone, address: e.address, outstandingBalance: e.outstandingBalance || 0 }),
};
export const supplierRepository = new OfflineCrudRepository(config);
