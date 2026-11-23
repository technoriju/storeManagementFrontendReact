/**
 * Utilities for strictly resolving real purchase units.
 * Guarantees that generic placeholder strings like 'Unit' or 'N/A' are never shown to the user.
 */

export function resolveRealPurchaseUnit(item: any, prod?: any, baseUnit?: any): string {
  const candidates = [
    item?.unit,
    item?.unitName,
    item?.baseUnitName,
    item?.product?.unitName,
    item?.product?.baseUnitName,
    item?.product?.baseUnit?.name,
    item?.product?.baseUnit?.shortName,
    item?.productUnit?.unit?.name,
    item?.productUnit?.unit?.shortName,
    item?.productUnit?.name,
    item?.product?.unit?.name,
    item?.fallbackBaseUnitName,
    prod?.unitName,
    prod?.baseUnitName,
    prod?.baseUnit?.name,
    prod?.unit?.name,
    baseUnit?.name,
    baseUnit?.shortName,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      const val = c.trim();
      const lower = val.toLowerCase();
      if (lower !== 'unit' && lower !== 'n/a' && lower !== 'null' && lower !== 'undefined') {
        return val;
      }
    }
  }

  const subCandidates = [
    item?.subUnit,
    item?.subUnitName,
    item?.product?.subUnitName,
    item?.product?.subUnit?.name,
    prod?.subUnitName,
    prod?.subUnit?.name,
  ];
  for (const s of subCandidates) {
    if (typeof s === 'string' && s.trim()) {
      const val = s.trim();
      const lower = val.toLowerCase();
      if (lower !== 'unit' && lower !== 'n/a' && lower !== 'null' && lower !== 'undefined') {
        return val;
      }
    }
  }

  return 'Pcs';
}

export function resolveRealPurchaseSubUnit(item: any, prod?: any, subUnit?: any): string {
  const candidates = [
    item?.subUnit,
    item?.subUnitName,
    item?.product?.subUnitName,
    item?.product?.subUnit?.name,
    item?.product?.subunit?.name,
    prod?.subUnitName,
    prod?.subUnit?.name,
    prod?.subunit?.name,
    subUnit?.name,
    subUnit?.shortName,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      const val = c.trim();
      const lower = val.toLowerCase();
      if (lower !== 'unit' && lower !== 'n/a' && lower !== 'null' && lower !== 'undefined') {
        return val;
      }
    }
  }

  return 'Pcs';
}

export function resolveActivePurchaseUnit(item: any, prod?: any, baseUnit?: any, subUnit?: any): string {
  const isSub = item?.unitType === 'sub';
  if (isSub) {
    return resolveRealPurchaseSubUnit(item, prod, subUnit);
  }
  return resolveRealPurchaseUnit(item, prod, baseUnit);
}
