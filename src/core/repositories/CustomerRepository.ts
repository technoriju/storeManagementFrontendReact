import { BaseRepository } from './BaseRepository';
import { Customer } from '../../types/models';
import { apiClient } from '../api/api-client';

export class CustomerRepository extends BaseRepository<Customer> {
  protected tableName = 'customers';

  protected getInsertColumns(): string {
    return 'id, name, email, phone, address, taxId, createdAt, updatedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'name = ?, email = ?, phone = ?, address = ?, taxId = ?, createdAt = ?, updatedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Customer): any[] {
    return [
      entity.id,
      entity.name,
      entity.email || null,
      entity.phone || null,
      entity.address || null,
      entity.taxId || null,
      entity.createdAt,
      entity.updatedAt,
      entity.syncStatus || 'synced'
    ];
  }

  protected fromRow(row: any): Customer {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      taxId: row.taxId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      syncStatus: row.syncStatus,
    };
  }

  protected async syncWithApi(entity: Customer, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      if (operation === 'insert') {
        await apiClient.post('/customers', entity);
      } else if (operation === 'update') {
        await apiClient.put(`/customers/${entity.id}`, entity);
      } else if (operation === 'delete') {
        await apiClient.delete(`/customers/${entity.id}`);
      }
      
      if (operation !== 'delete' && entity.syncStatus !== 'synced') {
        entity.syncStatus = 'synced';
        await this.update(entity);
      }
    } catch (error) {
      console.error(`Failed to sync customer ${entity.id} with API:`, error);
    }
  }

  public async fetchFromApi(): Promise<void> {
    try {
      const response = await apiClient.get('/customers');
      const items: Customer[] = response.data;

      for (const item of items) {
        item.syncStatus = 'synced';
        const existing = await this.getById(item.id);
        if (existing) {
          await this.update(item);
        } else {
          await this.insert(item);
        }
      }
    } catch (error) {
      console.error('Failed to fetch customers from API:', error);
    }
  }
}

export const customerRepository = new CustomerRepository();
