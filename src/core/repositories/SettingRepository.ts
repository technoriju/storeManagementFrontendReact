import { db } from '../database/db';
import { Setting } from '../../types/models';
import { apiClient } from '../api/api-client';

export class SettingRepository {
  async get(key: string): Promise<Setting | null> {
    const res = await db.execute(
      'SELECT * FROM settings WHERE key = ?',
      [key]
    );
    if (res.rows?.length) {
      const row = res.rows[0] as any;
      return {
        key: row.key,
        value: row.value,
        updatedAt: row.updatedAt,
      };
    }
    return null;
  }

  async getAll(): Promise<Setting[]> {
    const res = await db.execute('SELECT * FROM settings');
    const items: Setting[] = [];
    if (res.rows) {
      for (let i = 0; i < res.rows.length; i++) {
        const row = res.rows[i] as any;
        items.push({
          key: row.key,
          value: row.value,
          updatedAt: row.updatedAt,
        });
      }
    }
    return items;
  }

  async set(key: string, value: string): Promise<void> {
    const updatedAt = new Date().toISOString();
    await db.execute(
      'INSERT INTO settings (key, value, updatedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updatedAt = ?',
      [key, value, updatedAt, value, updatedAt]
    );

    // Optional sync to API
    this.syncWithApi({ key, value, updatedAt }).catch(console.error);
  }

  async delete(key: string): Promise<void> {
    await db.execute('DELETE FROM settings WHERE key = ?', [key]);
  }

  protected async syncWithApi(setting: Setting): Promise<void> {
    try {
      await apiClient.put(`/settings/${setting.key}`, { value: setting.value });
    } catch (error) {
      console.error(`Failed to sync setting ${setting.key} with API:`, error);
    }
  }

  public async fetchFromApi(): Promise<void> {
    try {
      const response = await apiClient.get('/settings');
      // Assume API returns an object of key-value pairs or an array of Setting objects
      const items = response.data;
      if (Array.isArray(items)) {
        for (const item of items) {
          await this.set(item.key, item.value);
        }
      } else {
        for (const key of Object.keys(items)) {
          await this.set(key, items[key]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings from API:', error);
    }
  }
}

export const settingRepository = new SettingRepository();
