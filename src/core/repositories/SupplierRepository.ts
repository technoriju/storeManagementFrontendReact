import { BaseRepository } from './BaseRepository';
import { Supplier } from '../../types/models';
import { apiClient } from '../api/api-client';

export class SupplierRepository extends BaseRepository<Supplier> {
  protected tableName = 'suppliers';

  protected getInsertColumns(): string {
    return 'id, name, contactName, email, phone, address, createdAt, updatedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'name = ?, contactName = ?, email = ?, phone = ?, address = ?, createdAt = ?, updatedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Supplier): any[] {
    return [
      entity.id,
      entity.name,
      entity.contactName || null,
      entity.email || null,
      entity.phone || null,
      entity.address || null,
      entity.createdAt,
      entity.updatedAt,
      entity.syncStatus || 'synced'
    ];
  }

  protected fromRow(row: any): Supplier {
    return {
      id: row.id,
      name: row.name,
      contactName: row.contactName,
      email: row.email,
      phone: row.phone,
      address: row.address,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      syncStatus: row.syncStatus,
    };
  }

  protected async syncWithApi(entity: Supplier, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      if (operation === 'insert') {
        await apiClient.post('/suppliers', entity);
      } else if (operation === 'update') {
        await apiClient.put(`/suppliers/${entity.id}`, entity);
      } else if (operation === 'delete') {
        await apiClient.delete(`/suppliers/${entity.id}`);
      }
      
      if (operation !== 'delete' && entity.syncStatus !== 'synced') {
        entity.syncStatus = 'synced';
        await this.update(entity);
      }
    } catch (error) {
      console.error(`Failed to sync supplier ${entity.id} with API:`, error);
    }
  }

  public async fetchFromApi(): Promise<void> {
    try {
      const response = await apiClient.get('/suppliers');
      const items: Supplier[] = response.data;

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
      console.error('Failed to fetch suppliers from API:', error);
    }
  }
}

export const supplierRepository = new SupplierRepository();
