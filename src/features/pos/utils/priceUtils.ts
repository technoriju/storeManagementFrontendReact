import { Product } from '../../products/types';

export type PriceType = 'wholesale' | 'retail';

/**
 * Returns effective price for a product based on price type ('wholesale' | 'retail').
 * By default, wholesale price is used.
 * Falls back safely to retailPrice, price, or 0 if a specific price tier is missing/zero.
 */
export function getProductPriceByType(product: Product, type: PriceType = 'wholesale'): number {
  if (!product) return 0;

  if (type === 'wholesale') {
    if (product.wholesalePrice !== undefined && product.wholesalePrice !== null && Number(product.wholesalePrice) > 0) {
      return Number(product.wholesalePrice);
    }
    if (product.price !== undefined && product.price !== null && Number(product.price) > 0) {
      return Number(product.price);
    }
    if (product.retailPrice !== undefined && product.retailPrice !== null && Number(product.retailPrice) > 0) {
      return Number(product.retailPrice);
    }
    return 0;
  } else {
    // Retail
    if (product.retailPrice !== undefined && product.retailPrice !== null && Number(product.retailPrice) > 0) {
      return Number(product.retailPrice);
    }
    if (product.price !== undefined && product.price !== null && Number(product.price) > 0) {
      return Number(product.price);
    }
    if (product.wholesalePrice !== undefined && product.wholesalePrice !== null && Number(product.wholesalePrice) > 0) {
      return Number(product.wholesalePrice);
    }
    return 0;
  }
}
