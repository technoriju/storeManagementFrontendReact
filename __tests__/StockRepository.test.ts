import { stockRepository, StockItem } from '../src/core/repositories/StockRepository';
import { db } from '../src/core/database/db';
import { apiClient } from '../src/core/api/api-client';

jest.mock('../src/core/database/db', () => ({
  db: {
    execute: jest.fn(),
  },
}));

jest.mock('../src/core/api/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('StockRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStocks', () => {
    it('should compute status and calculate summary correctly when reading from local SQLite', async () => {
      // API fails (simulate offline mode)
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      // SQLite returns 3 products: one normal, one low stock, one out of stock
      (db.execute as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 1,
            name: 'Item In Stock',
            sku: 'SKU-001',
            stockQuantity: 25,
            lowStockThreshold: 10,
            cost: 100,
            price: 150,
            unit: 'pcs',
          },
          {
            id: 2,
            name: 'Item Low Stock',
            sku: 'SKU-002',
            stockQuantity: 4,
            lowStockThreshold: 10,
            cost: 50,
            price: 80,
            unit: 'box',
          },
          {
            id: 3,
            name: 'Item Out Of Stock',
            sku: 'SKU-003',
            stockQuantity: 0,
            lowStockThreshold: 5,
            cost: 200,
            price: 300,
            unit: 'pcs',
          },
        ],
      });

      const { items, summary } = await stockRepository.getStocks();

      expect(items.length).toBe(3);
      expect(items[0].status).toBe('IN_STOCK');
      expect(items[0].stockValue).toBe(2500); // 25 * 100

      expect(items[1].status).toBe('LOW_STOCK'); // 4 <= 10
      expect(items[1].stockValue).toBe(200); // 4 * 50

      expect(items[2].status).toBe('OUT_OF_STOCK'); // 0 <= 0
      expect(items[2].stockValue).toBe(0);

      expect(summary.totalProducts).toBe(3);
      expect(summary.totalStockQuantity).toBe(29); // 25 + 4 + 0
      expect(summary.totalStockValue).toBe(2700); // 2500 + 200 + 0
      expect(summary.inStockCount).toBe(1);
      expect(summary.lowStockCount).toBe(1);
      expect(summary.outOfStockCount).toBe(1);
    });

    it('should filter items by search query', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Offline'));
      (db.execute as jest.Mock).mockResolvedValue({
        rows: [
          { id: 1, name: 'Apple iPhone', sku: 'IPHONE-15', stockQuantity: 10 },
          { id: 2, name: 'Samsung Galaxy', sku: 'SAMSUNG-S24', stockQuantity: 5 },
        ],
      });

      const { items } = await stockRepository.getStocks({ search: 'galaxy' });
      expect(items.length).toBe(1);
      expect(items[0].sku).toBe('SAMSUNG-S24');
    });
  });

  describe('addStock', () => {
    it('should update local product stock and record stock transaction', async () => {
      // Mock existing product in DB
      (db.execute as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Coffee Mug', sku: 'MUG-01', stockQuantity: 10 }],
        }) // SELECT
        .mockResolvedValueOnce({ rowsAffected: 1 }) // UPDATE
        .mockResolvedValueOnce({ insertId: 1 }); // INSERT stock_transactions

      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      const result = await stockRepository.addStock({
        productId: 1,
        quantity: 5,
        reason: 'Restock shipment',
      });

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE products SET stockQuantity = ?'),
        expect.arrayContaining([15, 1]), // newStock = 10 + 5 = 15
      );

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO stock_transactions'),
        expect.arrayContaining([1, 'Coffee Mug', 'ADD_STOCK', 5, 10, 15]),
      );

      expect(apiClient.post).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('adjustStock', () => {
    it('should set exact count when adjustmentType is SET', async () => {
      (db.execute as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'T-Shirt', sku: 'TS-01', stockQuantity: 20 }],
        })
        .mockResolvedValueOnce({ rowsAffected: 1 })
        .mockResolvedValueOnce({ insertId: 1 });

      (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      await stockRepository.adjustStock({
        productId: 1,
        adjustmentType: 'SET',
        quantity: 14,
        reason: 'Physical count audit',
      });

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE products SET stockQuantity = ?'),
        expect.arrayContaining([14, 1]), // new stock is 14
      );

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO stock_transactions'),
        expect.arrayContaining([1, 'ADJUSTMENT_SET', 6, 20, 14]), // delta = |14 - 20| = 6
      );
    });

    it('should deduct count when adjustmentType is SUBTRACT', async () => {
      (db.execute as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'T-Shirt', sku: 'TS-01', stockQuantity: 20 }],
        })
        .mockResolvedValueOnce({ rowsAffected: 1 })
        .mockResolvedValueOnce({ insertId: 1 });

      (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      await stockRepository.adjustStock({
        productId: 1,
        adjustmentType: 'SUBTRACT',
        quantity: 5,
        reason: 'Damaged item written off',
      });

      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE products SET stockQuantity = ?'),
        expect.arrayContaining([15, 1]), // 20 - 5 = 15
      );
    });
  });
});
