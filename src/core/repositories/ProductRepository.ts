import { BaseRepository } from './BaseRepository';
import { Product } from '../../types/models';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';

export class ProductRepository extends BaseRepository<Product> {
  protected tableName = 'products';

  protected getInsertColumns(): string {
    return 'id, name, sku, barcode, hsn, gst, description, price, cost, purchasePrice, wholesalePrice, retailPrice, mrp, categoryId, subCategoryId, brandId, categoryName, brandName, unitId, subunitId, conversionRate, openingStock, stockQuantity, lowStockThreshold, createdAt, updatedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'name = ?, sku = ?, barcode = ?, hsn = ?, gst = ?, description = ?, price = ?, cost = ?, purchasePrice = ?, wholesalePrice = ?, retailPrice = ?, mrp = ?, categoryId = ?, subCategoryId = ?, brandId = ?, categoryName = ?, brandName = ?, unitId = ?, subunitId = ?, conversionRate = ?, openingStock = ?, stockQuantity = ?, lowStockThreshold = ?, createdAt = ?, updatedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Product): any[] {
    return [
      entity.id,
      entity.name,
      entity.sku,
      entity.barcode || null,
      entity.hsn || null,
      entity.gst !== undefined ? entity.gst : null,
      entity.description || null,
      entity.price,
      entity.cost,
      entity.purchasePrice !== undefined ? entity.purchasePrice : null,
      entity.wholesalePrice !== undefined ? entity.wholesalePrice : null,
      entity.retailPrice !== undefined ? entity.retailPrice : null,
      entity.mrp !== undefined ? entity.mrp : null,
      entity.categoryId || null,
      entity.subCategoryId || null,
      entity.brandId || null,
      entity.categoryName || entity.category?.name || null,
      entity.brandName || entity.brand?.name || null,
      entity.unitId || null,
      (entity.subunitId || (entity as any).subUnitId) ? Number(entity.subunitId || (entity as any).subUnitId) : null,
      entity.conversionRate !== undefined ? Number(entity.conversionRate) : 1,
      entity.openingStock !== undefined ? entity.openingStock : 0,
      entity.stockQuantity !== undefined ? entity.stockQuantity : 0,
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
      hsn: row.hsn,
      gst: row.gst,
      description: row.description,
      price: row.price,
      cost: row.cost,
      purchasePrice: row.purchasePrice !== null && row.purchasePrice !== undefined ? Number(row.purchasePrice) : Number(row.cost ?? 0),
      wholesalePrice: row.wholesalePrice !== null && row.wholesalePrice !== undefined ? Number(row.wholesalePrice) : 0,
      retailPrice: row.retailPrice !== null && row.retailPrice !== undefined ? Number(row.retailPrice) : Number(row.price ?? 0),
      mrp: row.mrp,
      categoryId: row.categoryId,
      subCategoryId: row.subCategoryId,
      brandId: row.brandId,
      categoryName: row.categoryName,
      brandName: row.brandName,
      category: row.categoryName ? { id: row.categoryId, name: row.categoryName } : undefined,
      brand: row.brandName ? { id: row.brandId, name: row.brandName } : undefined,
      unitId: row.unitId,
      baseUnitId: row.unitId,
      subunitId: row.subunitId ? Number(row.subunitId) : undefined,
      subUnitId: row.subunitId ? String(row.subunitId) : undefined,
      conversionRate: row.conversionRate !== undefined && row.conversionRate !== null ? Number(row.conversionRate) : 1,
      openingStock: row.openingStock,
      stockQuantity: row.stockQuantity !== undefined && row.stockQuantity !== null ? Number(row.stockQuantity) : 0,
      lowStockThreshold: row.lowStockThreshold,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      syncStatus: row.syncStatus,
    };
  }

  private toApiPayload(entity: Product): any {
    const unitId = entity.unitId || (entity as any).baseUnitId;
    const baseUnitId = unitId ? Number(unitId) : 1;
    const sku = entity.sku || (entity as any).productCode || `SKU-${Date.now()}`;
    const productCode = (entity as any).productCode || sku;

    const payload: any = {
      name: entity.name,
      sku,
      productCode,
      baseUnitId,
      unitId: baseUnitId,
    };

    if (entity.barcode) payload.barcode = entity.barcode;
    if (entity.description) payload.description = entity.description;
    if (entity.hsn) {
      payload.hsn = entity.hsn;
      payload.hsnCode = entity.hsn;
    }
    if (entity.categoryId) payload.categoryId = Number(entity.categoryId);
    if (entity.subCategoryId) payload.subCategoryId = Number(entity.subCategoryId);
    if (entity.brandId) payload.brandId = Number(entity.brandId);

    if (entity.purchasePrice !== undefined && entity.purchasePrice !== null) {
      payload.purchasePrice = Number(entity.purchasePrice);
    } else if (entity.cost !== undefined && entity.cost !== null) {
      payload.purchasePrice = Number(entity.cost);
    }

    if (entity.wholesalePrice !== undefined && entity.wholesalePrice !== null) {
      payload.wholesalePrice = Number(entity.wholesalePrice);
    }

    if (entity.retailPrice !== undefined && entity.retailPrice !== null) {
      payload.retailPrice = Number(entity.retailPrice);
    } else if (entity.price !== undefined && entity.price !== null) {
      payload.retailPrice = Number(entity.price);
    }

    if (entity.price !== undefined && entity.price !== null) payload.price = Number(entity.price);
    if (entity.cost !== undefined && entity.cost !== null) payload.cost = Number(entity.cost);
    if (entity.lowStockThreshold !== undefined && entity.lowStockThreshold !== null) {
      payload.lowStockThreshold = Number(entity.lowStockThreshold);
      payload.lowStockLevel = Number(entity.lowStockThreshold);
    }
    if (entity.stockQuantity !== undefined && entity.stockQuantity !== null) {
      payload.stockQuantity = Number(entity.stockQuantity);
    }
    const subUnitId = entity.subUnitId || entity.subunitId || (entity as any).sub_unit_id;
    if (subUnitId) {
      payload.subUnitId = Number(subUnitId);
      payload.subunitId = Number(subUnitId);
    }
    if (entity.conversionRate !== undefined && entity.conversionRate !== null) {
      payload.conversionRate = Number(entity.conversionRate);
    }

    return payload;
  }

  protected async syncWithApi(entity: Product, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      const payload = this.toApiPayload(entity);
      let syncSuccess = false;

      if (operation === 'insert') {
        const response = await apiClient.post(API_ENDPOINTS.PRODUCTS.BASE, payload);
        const serverData = response.data?.data || response.data;
        const serverId = serverData?.id;
        if (serverId && serverId.toString() !== entity.id.toString()) {
          entity.id = Number(serverId);
          entity.syncStatus = 'synced';
          await this.update(entity);
          syncSuccess = true;
        } else if (response.status >= 200 && response.status < 300) {
          syncSuccess = true;
        }
      } else if (operation === 'update') {
        const targetId = (entity as any).backendId || entity.id;
        const response = await apiClient.put(API_ENDPOINTS.PRODUCTS.BY_ID(targetId), payload);
        if (response.status >= 200 && response.status < 300) {
          syncSuccess = true;
        }
      } else if (operation === 'delete') {
        const targetId = (entity as any).backendId || entity.id;
        await apiClient.delete(API_ENDPOINTS.PRODUCTS.BY_ID(targetId));
      }
      
      // If successful, ensure syncStatus is 'synced'
      if (operation !== 'delete' && syncSuccess && entity.syncStatus !== 'synced') {
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
      const rawProducts: any[] = response.data?.data || response.data || [];

      if (!Array.isArray(rawProducts)) return;

      for (const item of rawProducts) {
        const purchasePrice = item.purchasePrice !== undefined && item.purchasePrice !== null ? Number(item.purchasePrice) : Number(item.cost ?? 0);
        const wholesalePrice = item.wholesalePrice !== undefined && item.wholesalePrice !== null ? Number(item.wholesalePrice) : 0;
        const retailPrice = item.retailPrice !== undefined && item.retailPrice !== null ? Number(item.retailPrice) : Number(item.price ?? 0);
        const stockQuantity = Number(item.stockQuantity ?? item.openingStock ?? 0);
        const categoryName = item.category?.name || item.categoryName || undefined;
        const brandName = item.brand?.name || item.brandName || undefined;

        const product: Product = {
          id: Number(item.id),
          name: item.name,
          sku: item.sku || item.productCode || '',
          barcode: item.barcode || undefined,
          hsn: item.hsnCode || item.hsn || undefined,
          description: item.description || undefined,
          price: retailPrice,
          cost: purchasePrice,
          purchasePrice,
          wholesalePrice,
          retailPrice,
          categoryId: item.categoryId ? Number(item.categoryId) : undefined,
          subCategoryId: item.subCategoryId ? Number(item.subCategoryId) : undefined,
          brandId: item.brandId ? Number(item.brandId) : undefined,
          categoryName,
          brandName,
          category: item.category ? { id: Number(item.category.id), name: item.category.name } : (categoryName ? { id: Number(item.categoryId), name: categoryName } : undefined),
          brand: item.brand ? { id: Number(item.brand.id), name: item.brand.name } : (brandName ? { id: Number(item.brandId), name: brandName } : undefined),
          unitId: item.baseUnitId ? Number(item.baseUnitId) : (item.unitId ? Number(item.unitId) : undefined),
          baseUnitId: item.baseUnitId ? Number(item.baseUnitId) : (item.unitId ? Number(item.unitId) : undefined),
          subunitId: item.subUnitId ? Number(item.subUnitId) : (item.subunitId ? Number(item.subunitId) : undefined),
          subUnitId: item.subUnitId ? String(item.subUnitId) : (item.subunitId ? String(item.subunitId) : undefined),
          conversionRate: item.conversionRate ? Number(item.conversionRate) : (item.subUnit?.multiplier || 1),
          lowStockThreshold: item.lowStockLevel !== undefined ? Number(item.lowStockLevel) : (item.lowStockThreshold !== undefined ? Number(item.lowStockThreshold) : undefined),
          stockQuantity,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
          syncStatus: 'synced',
        };

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
