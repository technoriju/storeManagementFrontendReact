import { Customer } from '../../types/models';
import { CrudConfig, OfflineCrudRepository, endpointFor, idOf, now } from './OfflineCrudRepository';
const config: CrudConfig<Customer> = {
  tableName: 'customers', entityType: 'customers', endpoint: endpointFor('CUSTOMERS'),
  columns: 'id, backendId, name, email, phone, address, taxId, outstandingBalance, createdAt, updatedAt, syncStatus', placeholders: '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?',
  updateSet: 'backendId = ?, name = ?, email = ?, phone = ?, address = ?, taxId = ?, outstandingBalance = ?, createdAt = ?, updatedAt = ?, syncStatus = ?',
  toRow: e => [e.id, (e as any).backendId || null, e.name, e.email || null, e.phone || null, e.address || null, e.taxId || null, e.outstandingBalance || 0, e.createdAt || now(), e.updatedAt || now(), e.syncStatus || 'synced'],
  fromRow: r => ({ id: r.id, backendId: r.backendId || undefined, name: r.name, email: r.email || undefined, phone: r.phone || undefined, address: r.address || undefined, taxId: r.taxId || undefined, outstandingBalance: r.outstandingBalance || 0, createdAt: r.createdAt, updatedAt: r.updatedAt, syncStatus: r.syncStatus }),
  normalize: r => ({ id: idOf(r), backendId: idOf(r), name: r.name || r.customerName || 'Unnamed Customer', email: r.email, phone: r.phone, address: r.address, taxId: r.taxId || r.tax_id, outstandingBalance: Number(r.outstandingBalance || 0), createdAt: r.createdAt || now(), updatedAt: r.updatedAt || now(), syncStatus: 'synced' }),
  payload: e => ({ name: e.name, email: e.email, phone: e.phone, address: e.address, taxId: e.taxId, outstandingBalance: e.outstandingBalance || 0 }),
};
export const customerRepository = new OfflineCrudRepository(config);
