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
        shortName TEXT NOT NULL,
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
        multiplier REAL DEFAULT 1,
        status TEXT DEFAULT 'Active',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    for (const statement of [
      'ALTER TABLE units RENAME COLUMN abbreviation TO shortName',
      'ALTER TABLE units ADD COLUMN backendId INTEGER',
      'ALTER TABLE brands ADD COLUMN backendId INTEGER',
      'ALTER TABLE brands ADD COLUMN status TEXT DEFAULT \'Active\'',
      'ALTER TABLE sub_units ADD COLUMN backendId INTEGER',
      'ALTER TABLE sub_units ADD COLUMN multiplier REAL DEFAULT 1',
      'ALTER TABLE sub_units ADD COLUMN parentUnitId INTEGER',
      'ALTER TABLE sub_units ADD COLUMN status TEXT DEFAULT \'Active\'',
      'ALTER TABLE customers ADD COLUMN backendId INTEGER',
      'ALTER TABLE customers ADD COLUMN status TEXT DEFAULT \'ACTIVE\'',
      'ALTER TABLE suppliers ADD COLUMN backendId INTEGER',
      'ALTER TABLE suppliers ADD COLUMN status TEXT DEFAULT \'Active\'',
      'ALTER TABLE products ADD COLUMN subCategoryId INTEGER',
      'ALTER TABLE purchases ADD COLUMN reference TEXT',
      'ALTER TABLE purchases ADD COLUMN supplierName TEXT',
      'ALTER TABLE purchases ADD COLUMN date TEXT',
      'ALTER TABLE purchases ADD COLUMN paid REAL DEFAULT 0',
      'ALTER TABLE purchases ADD COLUMN due REAL DEFAULT 0',
      'ALTER TABLE purchases ADD COLUMN paymentStatus TEXT DEFAULT \'Unpaid\'',
      'ALTER TABLE purchases ADD COLUMN shipping REAL DEFAULT 0',
      'ALTER TABLE purchases ADD COLUMN orderTax REAL DEFAULT 0',
      'ALTER TABLE purchases ADD COLUMN notes TEXT',
      'ALTER TABLE purchase_items ADD COLUMN productName TEXT',
      'ALTER TABLE purchase_items ADD COLUMN taxAmount REAL DEFAULT 0',
      'ALTER TABLE purchase_items ADD COLUMN unitCost REAL DEFAULT 0',
      'ALTER TABLE purchase_items ADD COLUMN unit TEXT',
      'ALTER TABLE purchase_items ADD COLUMN unitType TEXT DEFAULT \'base\'',
      'ALTER TABLE purchase_items ADD COLUMN conversionRate REAL DEFAULT 1',
      'ALTER TABLE sales ADD COLUMN reference TEXT',
      'ALTER TABLE sales ADD COLUMN customerName TEXT',
      'ALTER TABLE sales ADD COLUMN supplierId INTEGER',
      'ALTER TABLE sales ADD COLUMN supplierName TEXT',
      'ALTER TABLE sales ADD COLUMN date TEXT',
      'ALTER TABLE sales ADD COLUMN paid REAL DEFAULT 0',
      'ALTER TABLE sales ADD COLUMN due REAL DEFAULT 0',
      'ALTER TABLE sales ADD COLUMN paymentStatus TEXT DEFAULT \'Unpaid\'',
      'ALTER TABLE sales ADD COLUMN shipping REAL DEFAULT 0',
      'ALTER TABLE sales ADD COLUMN orderTax REAL DEFAULT 0',
      'ALTER TABLE sales ADD COLUMN biller TEXT',
      'ALTER TABLE sales ADD COLUMN notes TEXT',
      'ALTER TABLE sale_items ADD COLUMN productName TEXT',
      'ALTER TABLE sale_items ADD COLUMN unitCost REAL DEFAULT 0',
      'ALTER TABLE sale_items ADD COLUMN taxAmount REAL DEFAULT 0',
      'ALTER TABLE sale_items ADD COLUMN unit TEXT',
      'ALTER TABLE sale_items ADD COLUMN unitType TEXT DEFAULT \'sub\'',
      'ALTER TABLE sale_items ADD COLUMN conversionRate REAL DEFAULT 1',
      'ALTER TABLE users ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE categories ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE sub_categories ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE units ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE brands ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE sub_units ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE unit_conversions ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE products ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE customers ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE suppliers ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE payments ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE sales ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE sale_items ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE purchases ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE purchase_items ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE expenses ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE quotations ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE quotation_items ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE purchase_orders ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE purchase_order_items ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE sale_returns ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE sale_return_items ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE purchase_returns ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE purchase_return_items ADD COLUMN syncStatus TEXT DEFAULT \'synced\'',
      'ALTER TABLE products ADD COLUMN categoryName TEXT',
      'ALTER TABLE products ADD COLUMN brandName TEXT',
      'ALTER TABLE payments ADD COLUMN backendId INTEGER',
      'ALTER TABLE payments ADD COLUMN type TEXT DEFAULT \'receive\'',
      'ALTER TABLE payments ADD COLUMN notes TEXT',
      'ALTER TABLE payments ADD COLUMN customerId INTEGER',
      'ALTER TABLE payments ADD COLUMN supplierId INTEGER',
      'ALTER TABLE sales ADD COLUMN previousDue REAL DEFAULT 0',
      'ALTER TABLE sales ADD COLUMN advancePayment REAL DEFAULT 0',
      'ALTER TABLE sales ADD COLUMN showPreviousBalance INTEGER DEFAULT 0',
      'ALTER TABLE purchases ADD COLUMN previousDue REAL DEFAULT 0',
      'ALTER TABLE purchases ADD COLUMN advancePayment REAL DEFAULT 0',
      'ALTER TABLE purchases ADD COLUMN showPreviousBalance INTEGER DEFAULT 0',
      'ALTER TABLE sale_items ADD COLUMN brandName TEXT',
      'ALTER TABLE sale_items ADD COLUMN subUnitName TEXT',
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
        subCategoryId INTEGER,
        brandId INTEGER,
        categoryName TEXT,
        brandName TEXT,
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
        status TEXT DEFAULT 'ACTIVE',
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
        backendId INTEGER,
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
        reference TEXT,
        customerId INTEGER,
        customerName TEXT,
        supplierId INTEGER,
        supplierName TEXT,
        date TEXT,
        subtotal REAL NOT NULL,
        discount REAL NOT NULL,
        orderTax REAL DEFAULT 0,
        shipping REAL DEFAULT 0,
        gst REAL NOT NULL,
        total REAL NOT NULL,
        paid REAL DEFAULT 0,
        due REAL DEFAULT 0,
        status TEXT NOT NULL,
        paymentStatus TEXT DEFAULT 'Unpaid',
        biller TEXT,
        notes TEXT,
        previousDue REAL DEFAULT 0,
        advancePayment REAL DEFAULT 0,
        showPreviousBalance INTEGER DEFAULT 0,
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
        productName TEXT,
        quantity REAL NOT NULL,
        unitPrice REAL NOT NULL,
        discount REAL NOT NULL,
        gst REAL NOT NULL,
        taxAmount REAL DEFAULT 0,
        unitCost REAL DEFAULT 0,
        unit TEXT,
        unitType TEXT DEFAULT 'sub',
        conversionRate REAL DEFAULT 1,
        brandName TEXT,
        subUnitName TEXT,
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
        reference TEXT,
        supplierId INTEGER,
        supplierName TEXT,
        date TEXT,
        subtotal REAL NOT NULL,
        discount REAL NOT NULL,
        gst REAL NOT NULL,
        total REAL NOT NULL,
        paid REAL DEFAULT 0,
        due REAL DEFAULT 0,
        status TEXT NOT NULL,
        paymentStatus TEXT DEFAULT 'Unpaid',
        notes TEXT,
        previousDue REAL DEFAULT 0,
        advancePayment REAL DEFAULT 0,
        showPreviousBalance INTEGER DEFAULT 0,
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
        productName TEXT,
        quantity REAL NOT NULL,
        unitPrice REAL NOT NULL,
        discount REAL NOT NULL,
        gst REAL NOT NULL,
        taxAmount REAL DEFAULT 0,
        unitCost REAL DEFAULT 0,
        unit TEXT,
        unitType TEXT DEFAULT 'base',
        conversionRate REAL DEFAULT 1,
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

    // Quotations Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS quotations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quotationNumber TEXT NOT NULL,
        customerId INTEGER NOT NULL,
        customerName TEXT,
        date TEXT NOT NULL,
        expiryDate TEXT,
        subtotal REAL NOT NULL,
        discount REAL DEFAULT 0,
        taxTotal REAL DEFAULT 0,
        shipping REAL DEFAULT 0,
        grandTotal REAL NOT NULL,
        status TEXT DEFAULT 'Sent',
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Quotation Items Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS quotation_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quotationId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        productName TEXT,
        quantity REAL NOT NULL,
        unitPrice REAL NOT NULL,
        discount REAL DEFAULT 0,
        taxAmount REAL DEFAULT 0,
        unit TEXT,
        unitType TEXT DEFAULT 'base',
        conversionRate REAL DEFAULT 1,
        total REAL NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Purchase Orders Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderNumber TEXT NOT NULL,
        supplierId INTEGER NOT NULL,
        supplierName TEXT,
        orderDate TEXT NOT NULL,
        expectedDate TEXT,
        subtotal REAL NOT NULL,
        discount REAL DEFAULT 0,
        taxTotal REAL DEFAULT 0,
        shipping REAL DEFAULT 0,
        grandTotal REAL NOT NULL,
        status TEXT DEFAULT 'Ordered',
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Purchase Order Items Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchaseOrderId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        productName TEXT,
        quantity REAL NOT NULL,
        unitPrice REAL NOT NULL,
        discount REAL DEFAULT 0,
        taxAmount REAL DEFAULT 0,
        unit TEXT,
        unitType TEXT DEFAULT 'base',
        conversionRate REAL DEFAULT 1,
        total REAL NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Sale Returns Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS sale_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saleId INTEGER,
        returnNumber TEXT NOT NULL,
        reference TEXT,
        customerId INTEGER,
        customerName TEXT,
        date TEXT NOT NULL,
        subtotal REAL DEFAULT 0,
        taxTotal REAL DEFAULT 0,
        discountTotal REAL DEFAULT 0,
        totalAmount REAL NOT NULL,
        status TEXT DEFAULT 'Received',
        reason TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Sale Return Items Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS sale_return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saleReturnId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        productName TEXT,
        quantity REAL NOT NULL,
        unitPrice REAL NOT NULL,
        discount REAL DEFAULT 0,
        taxAmount REAL DEFAULT 0,
        unit TEXT,
        unitType TEXT DEFAULT 'base',
        conversionRate REAL DEFAULT 1,
        total REAL NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Purchase Returns Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS purchase_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchaseId INTEGER,
        returnNumber TEXT NOT NULL,
        reference TEXT,
        supplierId INTEGER,
        supplierName TEXT,
        date TEXT NOT NULL,
        subtotal REAL DEFAULT 0,
        taxTotal REAL DEFAULT 0,
        discountTotal REAL DEFAULT 0,
        totalAmount REAL NOT NULL,
        status TEXT DEFAULT 'Received',
        reason TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Purchase Return Items Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS purchase_return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchaseReturnId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        productName TEXT,
        quantity REAL NOT NULL,
        unitPrice REAL NOT NULL,
        discount REAL DEFAULT 0,
        taxAmount REAL DEFAULT 0,
        unit TEXT,
        unitType TEXT DEFAULT 'base',
        conversionRate REAL DEFAULT 1,
        total REAL NOT NULL,
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

    // Stock Transactions Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS stock_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        productId INTEGER NOT NULL,
        productName TEXT,
        sku TEXT,
        type TEXT NOT NULL,
        quantity REAL NOT NULL,
        previousStock REAL NOT NULL,
        newStock REAL NOT NULL,
        reason TEXT,
        reference TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
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



