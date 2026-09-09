import { BaseRepository } from './BaseRepository';
import { Product } from '../../types/models';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';

export class ProductRepository extends BaseRepository<Product> {
  protected tableName = 'products';

  protected getInsertColumns(): string {
    return 'id, name, sku, barcode, description, price, cost, categoryId, unitId, stockQuantity, lowStockThreshold, createdAt, updatedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'name = ?, sku = ?, barcode = ?, description = ?, price = ?, cost = ?, categoryId = ?, unitId = ?, stockQuantity = ?, lowStockThreshold = ?, createdAt = ?, updatedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Product): any[] {
    return [
      entity.id,
      entity.name,
      entity.sku,
      entity.barcode || null,
      entity.description || null,
      entity.price,
      entity.cost,
      entity.categoryId || null,
      entity.unitId || null,
      entity.stockQuantity,
      entity.lowStockThreshold || null,
      entity.createdAt,
      entity.updatedAt,
      entity.syncStatus || 'synced'
    ];
  }

  protected fromRow(row: any): Product {
    return {
      id: row.id,
      name: row.name,
      sku: row.sku,
      barcode: row.barcode,
      description: row.description,
      price: row.price,
      cost: row.cost,
      categoryId: row.categoryId,
      unitId: row.unitId,
      stockQuantity: row.stockQuantity,
      lowStockThreshold: row.lowStockThreshold,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      syncStatus: row.syncStatus,
    };
  }

  protected async syncWithApi(entity: Product, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      if (operation === 'insert') {
        await apiClient.post(API_ENDPOINTS.PRODUCTS.BASE, entity);
      } else if (operation === 'update') {
        await apiClient.put(API_ENDPOINTS.PRODUCTS.BY_ID(entity.id), entity);
      } else if (operation === 'delete') {
        await apiClient.delete(API_ENDPOINTS.PRODUCTS.BY_ID(entity.id));
      }
      
      // If successful, ensure syncStatus is 'synced'
      if (operation !== 'delete' && entity.syncStatus !== 'synced') {
        entity.syncStatus = 'synced';
        await this.update(entity);
      }
    } catch (error) {
      console.error(`Failed to sync product ${entity.id} with API:`, error);
      // Depending on the offline-first strategy, we might leave it as pending_* here.
    }
  }

  public async fetchFromApi(): Promise<void> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BASE);
      const products: Product[] = response.data;

      // Basic full replace or upsert logic
      for (const product of products) {
        product.syncStatus = 'synced';
        const existing = await this.getById(product.id);
        if (existing) {
          await this.update(product);
        } else {
          await this.insert(product);
        }
      }
    } catch (error) {
      console.error('Failed to fetch products from API:', error);
    }
  }
}

export const productRepository = new ProductRepository();
