import { db } from '../../../core/database/db';
import { useProductStore } from '../../products/store/productStore';
import { useBrandStore } from '../../brands/store/brandStore';
import { useSubUnitStore } from '../../sub_units/store/subUnitStore';

/**
 * Enriches sale line items with brand and sub-unit metadata.
 * Uses SQLite product joins first, then falls back to memory stores.
 */
export async function enrichSaleItemsWithProductMeta<T extends Record<string, any>>(items: T[]): Promise<T[]> {
  if (!Array.isArray(items) || items.length === 0) return items;

  // Check if every item already has non-empty brand and subUnit
  const allPopulated = items.every(
    (it) =>
      it &&
      (it.brand || it.brandName) &&
      (it.subUnit || it.subUnitName) &&
      String(it.brand || it.brandName).trim() !== 'N/A' &&
      String(it.subUnit || it.subUnitName).trim() !== 'N/A'
  );
  if (allPopulated) return items;

  const productStoreList = useProductStore.getState().products || [];
  const brandStoreList = useBrandStore.getState().brands || [];
  const subUnitStoreList = useSubUnitStore.getState().subUnits || [];

  const pIds = items
    .map((it) => Number(it.productId))
    .filter((id) => !isNaN(id) && id > 0);
  const pNames = items
    .map((it) => String(it.productName || '').trim())
    .filter((n) => n.length > 0);

  const dbProductMap = new Map<string, { brandName?: string; subUnitName?: string }>();

  if (pIds.length > 0 || pNames.length > 0) {
    try {
      const conditions: string[] = [];
      const params: any[] = [];

      if (pIds.length > 0) {
        conditions.push(`p.id IN (${pIds.map(() => '?').join(',')})`);
        params.push(...pIds);
      }
      if (pNames.length > 0) {
        conditions.push(`p.name IN (${pNames.map(() => '?').join(',')})`);
        params.push(...pNames);
      }

      const res = await db.execute(
        `SELECT p.id, p.name, 
                COALESCE(NULLIF(p.brandName, ''), b.name) as dbBrandName,
                su.name as dbSubUnitName
         FROM products p
         LEFT JOIN brands b ON (p.brandId = b.id OR p.brandId = b.backendId)
         LEFT JOIN sub_units su ON (p.subunitId = su.id OR p.subunitId = su.backendId)
         WHERE ${conditions.join(' OR ')}`,
        params
      );

      let rows: any[] = [];
      if (res.rows && Array.isArray(res.rows)) {
        rows = res.rows;
      } else if (res.rows && typeof res.rows === 'object' && '_array' in res.rows) {
        rows = (res.rows as any)._array;
      } else if (res.rows && typeof (res.rows as any).length === 'number') {
        for (let i = 0; i < (res.rows as any).length; i++) {
          rows.push((res.rows as any).item(i));
        }
      }

      for (const r of rows) {
        if (!r) continue;
        const brand = (r.dbBrandName || '').trim() || undefined;
        const subUnit = (r.dbSubUnitName || '').trim() || undefined;
        if (r.id) {
          dbProductMap.set(`id:${r.id}`, { brandName: brand, subUnitName: subUnit });
        }
        if (r.name) {
          dbProductMap.set(`name:${r.name.trim().toLowerCase()}`, { brandName: brand, subUnitName: subUnit });
        }
      }
    } catch (e) {
      console.warn('enrichSaleItemsWithProductMeta DB error:', e);
    }
  }

  return items.map((it) => {
    if (!it) return it;

    let brand = (it.brand || it.brandName || '').trim();
    if (brand === 'N/A') brand = '';

    let subUnit = (it.subUnit || it.subUnitName || '').trim();
    if (subUnit === 'N/A') subUnit = '';

    const pId = Number(it.productId);
    const pName = String(it.productName || '').trim();

    // 1. Try DB map by ID or Name
    const fromDb =
      (pId > 0 ? dbProductMap.get(`id:${pId}`) : undefined) ||
      (pName.length > 0 ? dbProductMap.get(`name:${pName.toLowerCase()}`) : undefined);
    if (!brand && fromDb?.brandName) brand = fromDb.brandName;
    if (!subUnit && fromDb?.subUnitName) subUnit = fromDb.subUnitName;

    // 2. Try productStore in memory
    const storeProduct = productStoreList.find(
      (p) => (pId && Number(p.id) === pId) || (pName && p.name?.trim().toLowerCase() === pName.toLowerCase())
    );
    if (storeProduct) {
      if (!brand) {
        brand = (storeProduct.brandName || storeProduct.brand?.name || '').trim();
        if (!brand && storeProduct.brandId) {
          const matchedBrand = brandStoreList.find((b) => Number(b.id) === Number(storeProduct.brandId));
          if (matchedBrand) brand = matchedBrand.name.trim();
        }
      }
      if (!subUnit) {
        subUnit = ((storeProduct as any).subUnitName || storeProduct.subUnit?.name || '').trim();
        if (!subUnit && (storeProduct.subunitId || (storeProduct as any).subUnitId)) {
          const suId = Number(storeProduct.subunitId || (storeProduct as any).subUnitId);
          const matchedSu = subUnitStoreList.find((s) => Number(s.id) === suId);
          if (matchedSu) subUnit = matchedSu.name.trim();
        }
      }
    }

    const convRate =
      it.conversionRate !== undefined && it.conversionRate !== null
        ? Number(it.conversionRate)
        : (it.product?.conversionRate
            ? Number(it.product.conversionRate)
            : (storeProduct?.conversionRate
                ? Number(storeProduct.conversionRate)
                : undefined));
    const baseUnitName =
      it.baseUnitName ||
      it.product?.baseUnitName ||
      it.product?.baseUnit?.name ||
      it.product?.unitName ||
      storeProduct?.baseUnitName ||
      storeProduct?.baseUnit?.name ||
      it.unit;

    return {
      ...it,
      brand: brand || undefined,
      brandName: brand || undefined,
      subUnit: subUnit || undefined,
      subUnitName: subUnit || undefined,
      conversionRate: convRate,
      baseUnitName: baseUnitName || undefined,
    };
  });
}
