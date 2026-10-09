import { BaseRepository } from './BaseRepository';
import { Product } from '../../types/models';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';
import { db } from '../database/db';
import { outboxRepo, tombstoneRepo, OutboxItem } from '../sync/outbox';

export class ProductRepository extends BaseRepository<Product> {
  protected tableName = 'products';

  private requestSync(): void {
    void import('../sync/SyncEngine').then(({ syncEngine }) => syncEngine.syncNow());
  }

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
          await this.update(entity, false);
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
        await this.update(entity, false);
      }
    } catch (error) {
      console.error(`Failed to sync product ${entity.id} with API:`, error);
      // Depending on the offline-first strategy, we might leave it as pending_* here.
    }
  }

  public async saveRawProducts(rawProducts: any[]): Promise<Product[]> {
    const normalizedProducts: Product[] = [];

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

      if (await tombstoneRepo.isDeleted(this.tableName, product.id)) {
        continue;
      }

      const existing = await this.getById(product.id);
      if (existing) {
        await this.update(product, false);
      } else {
        await this.insert(product, false);
      }
      normalizedProducts.push(product);
    }

    // Cleanup local records deleted from server
    const serverIds = rawProducts.map((x: any) => Number(x.id)).filter((id: number) => !isNaN(id) && id > 0);
    if (serverIds.length > 0) {
      const placeholders = serverIds.map(() => '?').join(',');
      await db.execute(
        `DELETE FROM products WHERE syncStatus = 'synced' AND id NOT IN (${placeholders})`,
        serverIds
      );
    }

    return normalizedProducts;
  }

  public override async delete(id: number, shouldSync = true): Promise<void> {
    const entity = await this.getById(id);
    await db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    if (shouldSync) {
      await tombstoneRepo.add(this.tableName, id);
      await outboxRepo.removeForEntity(this.tableName, id);
      if (/^\d+$/.test(String(id))) {
        await outboxRepo.add(this.tableName, id, 'DELETE', entity || { id });
        this.requestSync();
      }
      try {
        await apiClient.delete(API_ENDPOINTS.PRODUCTS.BY_ID(id));
      } catch (e) {
        console.warn(`Failed to delete product ${id} from API:`, e);
      }
    }
  }

  async syncOutboxItem(item: OutboxItem): Promise<void> {
    if (item.operation !== 'DELETE' && (await tombstoneRepo.isDeleted(this.tableName, item.entityId))) {
      return;
    }
    if (item.operation === 'DELETE') {
      if (!/^\d+$/.test(String(item.entityId))) return;
      try {
        await apiClient.delete(API_ENDPOINTS.PRODUCTS.BY_ID(item.entityId));
      } catch (e: any) {
        const status = e?.response?.status ?? e?.status;
        if (status >= 400 && status < 500) {
          return;
        }
        throw e;
      }
      return;
    }
    const entity = item.payload ? (JSON.parse(item.payload) as Product) : await this.getById(item.entityId);
    if (!entity) throw new Error(`Product ${item.entityId} not found`);
    await this.syncWithApi(entity, item.operation === 'CREATE' ? 'insert' : 'update');
  }

  public async fetchFromApi(): Promise<Product[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BASE);
      const rawProducts: any[] = response.data?.data || response.data || [];

      if (!Array.isArray(rawProducts)) return [];

      return await this.saveRawProducts(rawProducts);
    } catch (error) {
      console.error('Failed to fetch products from API:', error);
      return [];
    }
  }

  public async getPaginated(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ data: Product[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, params.limit || 10);
    const offset = (page - 1) * limit;
    const search = (params.search || '').trim();

    try {
      let whereClause = '';
      const queryParams: any[] = [];
      if (search) {
        whereClause = `WHERE (name LIKE ? OR sku LIKE ? OR barcode LIKE ? OR categoryName LIKE ? OR brandName LIKE ?)`;
        const pattern = `%${search}%`;
        queryParams.push(pattern, pattern, pattern, pattern, pattern);
      }

      const countRes = await db.execute(`SELECT COUNT(*) as totalCount FROM ${this.tableName} ${whereClause}`, queryParams);
      let total = 0;
      if (countRes?.rows && Array.isArray(countRes.rows) && countRes.rows.length > 0) {
        total = Number(countRes.rows[0].totalCount || 0);
      } else if (countRes?.rows && typeof countRes.rows === 'object') {
        const item = ('_array' in countRes.rows && countRes.rows._array?.[0]) || (typeof (countRes.rows as any).item === 'function' ? (countRes.rows as any).item(0) : countRes.rows[0]);
        total = Number(item?.totalCount || 0);
      }

      const dataRes = await db.execute(
        `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
      );
      
      let rawRows: any[] = [];
      if (dataRes?.rows && Array.isArray(dataRes.rows)) {
        rawRows = dataRes.rows;
      } else if (dataRes?.rows && typeof dataRes.rows === 'object') {
        if ('_array' in dataRes.rows && Array.isArray((dataRes.rows as any)._array)) {
          rawRows = (dataRes.rows as any)._array;
        } else if ('item' in dataRes.rows && typeof (dataRes.rows as any).length === 'number') {
          const len = (dataRes.rows as any).length;
          for (let i = 0; i < len; i++) {
            rawRows.push((dataRes.rows as any).item(i));
          }
        }
      }

      const items = rawRows.map((r) => this.fromRow(r));
      return {
        data: items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    } catch (e) {
      console.warn('Local SQLite getPaginated failed, falling back to in-memory filter:', e);
      const all = await this.getAll();
      let filtered = all;
      if (search) {
        const s = search.toLowerCase();
        filtered = all.filter(
          (p) =>
            (p.name && p.name.toLowerCase().includes(s)) ||
            (p.sku && p.sku.toLowerCase().includes(s)) ||
            (p.barcode && p.barcode.toLowerCase().includes(s)) ||
            (p.categoryName && p.categoryName.toLowerCase().includes(s)) ||
            (p.brandName && p.brandName.toLowerCase().includes(s))
        );
      }
      const total = filtered.length;
      return {
        data: filtered.slice(offset, offset + limit),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }
  }
}

export const productRepository = new ProductRepository();
