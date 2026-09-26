import { Platform } from 'react-native';
import { open, openAsync } from '@op-engineering/op-sqlite';

// Web needs openAsync. Fake empty database loses every offline record.
const rawDb: any = Platform.OS === 'web'
  ? (() => {
      const webDbPromise = openAsync({ name: 'billing_app.sqlite' });
      return {
        execute: (...args: any[]) => webDbPromise.then((webDb: any) => webDb.execute(...args)),
      };
    })()
  : open({ name: 'billing_app.sqlite' });

// Keep schema creation ahead of first read/write on web and native.
let dbQueue = Promise.resolve();
export const db: any = {
  execute: (...args: any[]) => {
    const result = dbQueue.then(() => rawDb.execute(...args));
    dbQueue = result.then(() => undefined, () => undefined);
    return result;
  },
};

// Helper function to initialize database tables
export const initializeDatabase = () => {
  try {
    // Users Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        parentId INTEGER,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    try {
      db.execute('ALTER TABLE categories ADD COLUMN backendId INTEGER;');
    } catch (e) {
      // Column might already exist, ignore
    }
    
    // Attempt to add deletedAt if missing (for existing local DBs)
    try {
      db.execute('ALTER TABLE categories ADD COLUMN deletedAt TEXT;');
    } catch (e) {
      // Column might already exist, ignore
    }

    // SubCategories Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS sub_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        categoryId INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    try {
      db.execute("ALTER TABLE sub_categories ADD COLUMN status TEXT DEFAULT 'active';");
    } catch (e) {
      // Column might already exist, ignore
    }

    // Units Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'Active',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    db.execute(`
      CREATE TABLE IF NOT EXISTS sub_units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        name TEXT NOT NULL,
        parentUnitId INTEGER,
        abbreviation TEXT,
        multiplier REAL DEFAULT 1,
        status TEXT DEFAULT 'Active',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    for (const statement of [
      'ALTER TABLE units ADD COLUMN backendId INTEGER',
      'ALTER TABLE brands ADD COLUMN backendId INTEGER',
      'ALTER TABLE brands ADD COLUMN status TEXT DEFAULT \'Active\'',
      'ALTER TABLE customers ADD COLUMN backendId INTEGER',
      'ALTER TABLE suppliers ADD COLUMN backendId INTEGER',
    ]) {
      try { db.execute(statement); } catch (e) { /* Existing database already migrated. */ }
    }

    // Unit Conversions Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS unit_conversions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fromunitId INTEGER NOT NULL,
        tounitId INTEGER NOT NULL,
        multiplier REAL NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Products Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        categoryId INTEGER,
        brandId INTEGER,
        unitId INTEGER,
        subunitId INTEGER,
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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        method TEXT NOT NULL,
        type TEXT NOT NULL,
        reference TEXT,
        notes TEXT,
        customerId INTEGER,
        supplierId INTEGER,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Sales Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoiceNumber TEXT NOT NULL,
        customerId INTEGER,
        subtotal REAL NOT NULL,
        discount REAL NOT NULL,
        gst REAL NOT NULL,
        total REAL NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Sale Items Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saleId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        quantity REAL NOT NULL,
        unitPrice REAL NOT NULL,
        discount REAL NOT NULL,
        gst REAL NOT NULL,
        total REAL NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Purchases Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoiceNumber TEXT NOT NULL,
        supplierId INTEGER,
        subtotal REAL NOT NULL,
        discount REAL NOT NULL,
        gst REAL NOT NULL,
        total REAL NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Purchase Items Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchaseId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        quantity REAL NOT NULL,
        unitPrice REAL NOT NULL,
        discount REAL NOT NULL,
        gst REAL NOT NULL,
        total REAL NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Expenses Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        reference TEXT,
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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entityType TEXT NOT NULL,
        entityId INTEGER NOT NULL,
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
        entityId INTEGER NOT NULL,
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



