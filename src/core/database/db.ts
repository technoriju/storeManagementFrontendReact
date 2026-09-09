import { open } from '@op-engineering/op-sqlite';

export const db = open({
  name: 'billing_app.sqlite',
});

// Helper function to initialize database tables
export const initializeDatabase = () => {
  try {
    // Users Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        firstName TEXT,
        lastName TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Categories Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        parentId TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Units Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        abbreviation TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Brands Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS brands (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Unit Conversions Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS unit_conversions (
        id TEXT PRIMARY KEY,
        fromUnitId TEXT NOT NULL,
        toUnitId TEXT NOT NULL,
        multiplier REAL NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Products Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT NOT NULL,
        barcode TEXT,
        hsn TEXT,
        gst REAL,
        description TEXT,
        price REAL NOT NULL,
        cost REAL NOT NULL,
        purchasePrice REAL,
        wholesalePrice REAL,
        retailPrice REAL,
        mrp REAL,
        categoryId TEXT,
        brandId TEXT,
        unitId TEXT,
        subUnitId TEXT,
        conversionRate REAL,
        openingStock REAL DEFAULT 0,
        stockQuantity REAL NOT NULL DEFAULT 0,
        lowStockThreshold REAL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Customers Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        taxId TEXT,
        outstandingBalance REAL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Suppliers Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contactName TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        outstandingBalance REAL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Payments Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        method TEXT NOT NULL,
        type TEXT NOT NULL,
        reference TEXT,
        notes TEXT,
        customerId TEXT,
        supplierId TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Settings Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    // Outbox Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS outbox (
        id TEXT PRIMARY KEY,
        entityType TEXT NOT NULL,
        entityId TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT,
        createdAt TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        retryCount INTEGER DEFAULT 0,
        lastError TEXT
      );
    `);

    // Sync Metadata
    db.execute(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    // Tombstones Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS tombstones (
        entityType TEXT NOT NULL,
        entityId TEXT NOT NULL,
        deletedAt TEXT NOT NULL,
        PRIMARY KEY (entityType, entityId)
      );
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};
