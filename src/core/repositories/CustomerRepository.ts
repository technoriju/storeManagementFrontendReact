import { Customer } from '../../types/models';
import { CrudConfig, OfflineCrudRepository, endpointFor, idOf, now } from './OfflineCrudRepository';
import { apiClient } from '../api/api-client';

const config: CrudConfig<Customer> = {
  tableName: 'customers', entityType: 'customers', endpoint: endpointFor('CUSTOMERS'),
  columns: 'id, backendId, name, email, phone, address, taxId, outstandingBalance, status, createdAt, updatedAt, syncStatus', placeholders: '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?',
  updateSet: 'backendId = ?, name = ?, email = ?, phone = ?, address = ?, taxId = ?, outstandingBalance = ?, status = ?, createdAt = ?, updatedAt = ?, syncStatus = ?',
  toRow: e => [e.id, (e as any).backendId || null, e.name, e.email || null, e.phone || null, e.address || null, e.taxId || null, e.outstandingBalance || 0, e.status || 'ACTIVE', e.createdAt || now(), e.updatedAt || now(), e.syncStatus || 'synced'],
  fromRow: r => ({ id: r.id, backendId: r.backendId || undefined, name: r.name || 'Unnamed Customer', email: r.email || undefined, phone: r.phone || undefined, address: r.address || undefined, taxId: r.taxId || undefined, outstandingBalance: r.outstandingBalance !== undefined && r.outstandingBalance !== null ? Number(r.outstandingBalance) : 0, status: r.status || 'ACTIVE', createdAt: r.createdAt, updatedAt: r.updatedAt, syncStatus: r.syncStatus }),
  normalize: r => {
    const rawBal = r.outstandingBalance !== undefined ? r.outstandingBalance : (r.outstanding_balance !== undefined ? r.outstanding_balance : r.balance);
    return {
      id: idOf(r),
      backendId: idOf(r),
      name: r.name || r.customerName || 'Unnamed Customer',
      email: r.email,
      phone: r.phone,
      address: r.address,
      taxId: r.taxId || r.tax_id,
      outstandingBalance: rawBal !== undefined && rawBal !== null ? Number(rawBal) : (undefined as any),
      status: r.status || 'ACTIVE',
      createdAt: r.createdAt || now(),
      updatedAt: r.updatedAt || now(),
      syncStatus: 'synced',
    };
  },
  payload: e => ({ name: e.name, email: e.email, phone: e.phone, address: e.address, taxId: e.taxId, status: e.status || 'ACTIVE' }),
};

export class CustomerRepository extends OfflineCrudRepository<Customer> {
  private cleanPhone(phone?: string): string {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  }

  isPhoneMatch(p1?: string, p2?: string): boolean {
    const c1 = this.cleanPhone(p1);
    const c2 = this.cleanPhone(p2);
    if (!c1 || !c2) return false;
    if (c1 === c2) return true;
    if (c1.length >= 10 && c2.length >= 10 && c1.slice(-10) === c2.slice(-10)) return true;
    return false;
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    const clean = this.cleanPhone(phone);
    if (!clean) return null;

    // 1. Check local SQLite
    const all = await this.getAll();
    const localMatch = all.find(c => this.isPhoneMatch(c.phone, clean));
    if (localMatch) {
      return localMatch;
    }

    // 2. If online, check API
    try {
      const response = await apiClient.get(endpointFor('CUSTOMERS').BASE, {
        params: { search: clean },
      });
      const list = Array.isArray(response?.data?.data)
        ? response.data.data
        : (Array.isArray(response?.data) ? response.data : []);
      const serverMatch = list.find((c: any) => this.isPhoneMatch(c.phone, clean));
      if (serverMatch && Number(serverMatch.id) > 0) {
        const entity: Customer = {
          ...serverMatch,
          id: Number(serverMatch.id),
          backendId: Number(serverMatch.id),
          syncStatus: 'synced',
        };
        const existing = await this.getById(entity.id);
        if (existing) await this.update(entity, false);
        else await this.insert(entity, false);
        return entity;
      }
    } catch (_) {}

    return null;
  }

  async findOrCreateByPhone(phone: string, name?: string): Promise<Customer> {
    const trimmedPhone = phone.trim();
    const existing = await this.findByPhone(trimmedPhone);
    if (existing) {
      return existing;
    }

    const assignedName = name?.trim() ? name.trim() : `Customer ${trimmedPhone}`;
    return await this.createDirect({
      name: assignedName,
      phone: trimmedPhone,
      status: 'ACTIVE',
    });
  }

  async createDirect(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<Customer> {
    const trimmedName = data.name.trim();

    // 1. Check local SQLite first for existing customer with same phone (if phone provided) or name
    const all = await this.getAll();
    if (data.phone) {
      const phoneExisting = all.find(c => this.isPhoneMatch(c.phone, data.phone));
      if (phoneExisting && Number(phoneExisting.id) > 0) {
        return phoneExisting;
      }
    }

    const localExisting = all.find(
      c => c.name?.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (localExisting && Number(localExisting.id) > 0) {
      return localExisting;
    }

    // 2. If online, try server API directly
    try {
      const response = await apiClient.post(endpointFor('CUSTOMERS').BASE, {
        name: trimmedName,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        taxId: data.taxId || null,
        status: data.status || 'ACTIVE',
      });
      const body = response?.data?.data || response?.data || {};
      const serverId = Number(body.id || body._id || body.customerId);
      if (serverId && !isNaN(serverId)) {
        const entity: Customer = {
          ...data,
          name: trimmedName,
          id: serverId,
          backendId: serverId,
          createdAt: body.createdAt || now(),
          updatedAt: body.updatedAt || now(),
          syncStatus: 'synced',
        };
        const existing = await this.getById(serverId);
        if (existing) {
          await this.update(entity, false);
        } else {
          await this.insert(entity, false);
        }
        return entity;
      }
    } catch (err: any) {
      console.warn('[CustomerRepository] API create direct fallback:', err?.message);
      if (err?.response?.status === 409 || err?.message?.includes('already exists')) {
        try {
          const allRes = await apiClient.get(endpointFor('CUSTOMERS').BASE);
          const list = Array.isArray(allRes.data?.data) ? allRes.data.data : (Array.isArray(allRes.data) ? allRes.data : []);
          const match = list.find((c: any) =>
            (data.phone && this.isPhoneMatch(c.phone, data.phone)) ||
            (c.name?.trim().toLowerCase() === trimmedName.toLowerCase())
          );
          if (match && Number(match.id) > 0) {
            const entity: Customer = {
              ...match,
              id: Number(match.id),
              backendId: Number(match.id),
              syncStatus: 'synced',
            };
            const existing = await this.getById(entity.id);
            if (existing) await this.update(entity, false);
            else await this.insert(entity, false);
            return entity;
          }
        } catch (_) {}
      }
    }

    // 3. Fallback offline: temp negative ID + queue outbox
    const fallbackEntity: Customer = {
      ...data,
      name: trimmedName,
      id: Math.floor(Math.random() * -1000000000),
      createdAt: now(),
      updatedAt: now(),
      syncStatus: 'pending_insert',
    };
    await this.insert(fallbackEntity, true);
    return fallbackEntity;
  }
}

export const customerRepository = new CustomerRepository(config);
