import { Product, Customer } from '../../types/models';
import { v4 as uuidv4 } from 'uuid';

export const generateMockProducts = (count: number): Product[] => {
  const products: Product[] = [];
  const now = new Date().toISOString();
  for (let i = 0; i < count; i++) {
    products.push({
      id: uuidv4(),
      name: `Performance Test Product ${i}`,
      sku: `SKU-${i.toString().padStart(6, '0')}`,
      barcode: `890${i.toString().padStart(9, '0')}`,
      price: Math.floor(Math.random() * 1000) + 10,
      cost: Math.floor(Math.random() * 500) + 5,
      stockQuantity: Math.floor(Math.random() * 1000),
      createdAt: now,
      updatedAt: now,
      syncStatus: 'synced',
    });
  }
  return products;
};

export const generateMockCustomers = (count: number): Customer[] => {
  const customers: Customer[] = [];
  const now = new Date().toISOString();
  for (let i = 0; i < count; i++) {
    customers.push({
      id: uuidv4(),
      name: `Test Customer ${i}`,
      phone: `99${i.toString().padStart(8, '0')}`,
      email: `customer${i}@example.com`,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'synced',
    });
  }
  return customers;
};
