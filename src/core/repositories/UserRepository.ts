import { BaseRepository } from './BaseRepository';
import { User } from '../../types/models';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';

export class UserRepository extends BaseRepository<User> {
  protected tableName = 'users';

  protected getInsertColumns(): string {
    return 'id, username, email, role, firstName, lastName, createdAt, updatedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'username = ?, email = ?, role = ?, firstName = ?, lastName = ?, createdAt = ?, updatedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: User): any[] {
    return [
      entity.id,
      entity.username,
      entity.email,
      entity.role,
      entity.firstName || null,
      entity.lastName || null,
      entity.createdAt,
      entity.updatedAt,
      entity.syncStatus || 'synced'
    ];
  }

  protected fromRow(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      firstName: row.firstName,
      lastName: row.lastName,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      syncStatus: row.syncStatus,
    };
  }

  protected async syncWithApi(entity: User, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      if (operation === 'insert') {
        await apiClient.post(API_ENDPOINTS.USERS.BASE, entity);
      } else if (operation === 'update') {
        await apiClient.put(API_ENDPOINTS.USERS.BY_ID(entity.id), entity);
      } else if (operation === 'delete') {
        await apiClient.delete(API_ENDPOINTS.USERS.BY_ID(entity.id));
      }
      
      if (operation !== 'delete' && entity.syncStatus !== 'synced') {
        entity.syncStatus = 'synced';
        await this.update(entity);
      }
    } catch (error) {
      console.error(`Failed to sync user ${entity.id} with API:`, error);
    }
  }

  public async fetchFromApi(): Promise<void> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS.BASE);
      const items: User[] = response.data;

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
      console.error('Failed to fetch users from API:', error);
    }
  }
}

export const userRepository = new UserRepository();
