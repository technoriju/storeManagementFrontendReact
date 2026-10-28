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
      'ALTER TABLE expenses ADD COLUMN backendId INTEGER',
      'ALTER TABLE expenses ADD COLUMN deletedAt TEXT',
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
        backendId INTEGER,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        reference TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Expense Categories Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS expense_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'ACTIVE',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Incomes Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS incomes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        reference TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Income Categories Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS income_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'ACTIVE',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Bank Accounts Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        accountName TEXT NOT NULL,
        accountNumber TEXT,
        bankName TEXT,
        branchName TEXT,
        ifscCode TEXT,
        accountType TEXT DEFAULT 'BANK',
        openingBalance REAL DEFAULT 0,
        currentBalance REAL DEFAULT 0,
        status TEXT DEFAULT 'ACTIVE',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Money Transfers Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS money_transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        fromAccountId INTEGER NOT NULL,
        toAccountId INTEGER NOT NULL,
        fromAccountName TEXT,
        toAccountName TEXT,
        amount REAL NOT NULL,
        transferDate TEXT NOT NULL,
        reference TEXT,
        description TEXT,
        status TEXT DEFAULT 'COMPLETED',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
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

    // HRM: Departments Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        description TEXT,
        managerName TEXT,
        status TEXT DEFAULT 'ACTIVE',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // HRM: Designations Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS designations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        departmentId INTEGER,
        departmentName TEXT,
        description TEXT,
        status TEXT DEFAULT 'ACTIVE',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // HRM: Shifts Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        lateToleranceMinutes INTEGER DEFAULT 15,
        breakDurationMinutes INTEGER DEFAULT 60,
        status TEXT DEFAULT 'ACTIVE',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // HRM: Employees Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        employeeCode TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        departmentId INTEGER,
        departmentName TEXT,
        designationId INTEGER,
        designationName TEXT,
        shiftId INTEGER,
        shiftName TEXT,
        joiningDate TEXT NOT NULL,
        salary REAL NOT NULL DEFAULT 0,
        employmentType TEXT DEFAULT 'FULL_TIME',
        status TEXT DEFAULT 'ACTIVE',
        address TEXT,
        emergencyContact TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // HRM: Attendance Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS attendances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        employeeId INTEGER NOT NULL,
        employeeName TEXT NOT NULL,
        departmentName TEXT,
        date TEXT NOT NULL,
        clockIn TEXT,
        clockOut TEXT,
        status TEXT DEFAULT 'PRESENT',
        totalHours REAL,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // HRM: Leave Types Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        name TEXT NOT NULL,
        daysAllowed INTEGER NOT NULL DEFAULT 12,
        description TEXT,
        status TEXT DEFAULT 'ACTIVE',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // HRM: Leaves Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS leaves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        employeeId INTEGER NOT NULL,
        employeeName TEXT NOT NULL,
        departmentName TEXT,
        leaveTypeId INTEGER NOT NULL,
        leaveTypeName TEXT NOT NULL,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        totalDays REAL NOT NULL DEFAULT 1,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        appliedAt TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // HRM: Holidays Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS holidays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        dayOfWeek TEXT,
        type TEXT DEFAULT 'PUBLIC',
        description TEXT,
        status TEXT DEFAULT 'ACTIVE',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // HRM: Payroll Table
    db.execute(`
      CREATE TABLE IF NOT EXISTS payrolls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backendId INTEGER,
        employeeId INTEGER NOT NULL,
        employeeName TEXT NOT NULL,
        departmentName TEXT,
        designationName TEXT,
        month TEXT NOT NULL,
        year INTEGER NOT NULL,
        basicSalary REAL NOT NULL DEFAULT 0,
        allowances REAL NOT NULL DEFAULT 0,
        deductions REAL NOT NULL DEFAULT 0,
        netSalary REAL NOT NULL DEFAULT 0,
        paymentDate TEXT,
        paymentMethod TEXT,
        status TEXT DEFAULT 'PENDING',
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        syncStatus TEXT DEFAULT 'synced'
      );
    `);

    // Seed initial HRM data if empty
    seedHrmDefaults();

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

const seedHrmDefaults = async () => {
  try {
    const check = await db.execute('SELECT * FROM departments;');
    let rows: any[] = [];
    if (Array.isArray(check?.rows)) rows = check.rows;
    else if (check?.rows?._array) rows = check.rows._array;

    const hasValidDepts = rows.some((r) => r && r.name && typeof r.name === 'string' && r.name.trim().length > 0);
    if (hasValidDepts) return;

    // Clean any corrupt rows without names
    await db.execute('DELETE FROM departments;');
    await db.execute('DELETE FROM designations;');
    await db.execute('DELETE FROM shifts;');
    await db.execute('DELETE FROM employees;');
    await db.execute('DELETE FROM leave_types;');
    await db.execute('DELETE FROM holidays;');
    await db.execute('DELETE FROM attendances;');
    await db.execute('DELETE FROM leaves;');
    await db.execute('DELETE FROM payrolls;');

    const now = new Date().toISOString();

    // Default Departments
    const depts = [
      ['Sales & Marketing', 'DEP-SALES', 'Handles client relations, sales and marketing campaigns', 'Sarah Connor', 'ACTIVE', now, now],
      ['Accounts & Finance', 'DEP-FIN', 'Manages accounting, invoices, taxes, and audits', 'Michael Scott', 'ACTIVE', now, now],
      ['Inventory & Warehouse', 'DEP-INV', 'Oversees stock levels, dispatch, and goods receipts', 'Dwight Schrute', 'ACTIVE', now, now],
      ['Human Resources', 'DEP-HR', 'Recruitment, employee relations, and attendance', 'Toby Flenderson', 'ACTIVE', now, now],
      ['Information Technology', 'DEP-IT', 'Systems support, database and software infrastructure', 'Jim Halpert', 'ACTIVE', now, now],
    ];
    for (const d of depts) {
      await db.execute(
        'INSERT INTO departments (name, code, description, managerName, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?);',
        d
      );
    }

    // Default Designations
    const desigs = [
      ['Sales Executive', 'DES-SE', 1, 'Sales & Marketing', 'Field sales and customer acquisition', 'ACTIVE', now, now],
      ['Senior Accountant', 'DES-SA', 2, 'Accounts & Finance', 'General ledger and financial reporting', 'ACTIVE', now, now],
      ['Warehouse Manager', 'DES-WM', 3, 'Inventory & Warehouse', 'Warehouse operations and fulfillment', 'ACTIVE', now, now],
      ['HR Executive', 'DES-HR', 4, 'Human Resources', 'Employee onboarding and records', 'ACTIVE', now, now],
      ['Store Supervisor', 'DES-SS', 1, 'Sales & Marketing', 'Retail outlet floor supervision', 'ACTIVE', now, now],
    ];
    for (const dg of desigs) {
      await db.execute(
        'INSERT INTO designations (name, code, departmentId, departmentName, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
        dg
      );
    }

    // Default Shifts
    const shiftList = [
      ['Morning General', 'SHF-MG', '09:00', '18:00', 15, 60, 'ACTIVE', now, now],
      ['Early Shift', 'SHF-ES', '07:00', '16:00', 15, 60, 'ACTIVE', now, now],
      ['Evening Shift', 'SHF-EV', '14:00', '23:00', 15, 60, 'ACTIVE', now, now],
      ['Night Shift', 'SHF-NT', '22:00', '07:00', 15, 60, 'ACTIVE', now, now],
    ];
    for (const s of shiftList) {
      await db.execute(
        'INSERT INTO shifts (name, code, startTime, endTime, lateToleranceMinutes, breakDurationMinutes, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
        s
      );
    }

    // Default Employees
    const emps = [
      ['EMP-001', 'Alex', 'Morgan', 'alex.morgan@example.com', '+1 555-0101', 1, 'Sales & Marketing', 1, 'Sales Executive', 1, 'Morning General', '2023-01-15', 45000, 'FULL_TIME', 'ACTIVE', '123 Market Street, Suite 4', '+1 555-9001', now, now],
      ['EMP-002', 'David', 'Miller', 'david.miller@example.com', '+1 555-0102', 2, 'Accounts & Finance', 2, 'Senior Accountant', 1, 'Morning General', '2022-06-10', 58000, 'FULL_TIME', 'ACTIVE', '456 Financial Ave', '+1 555-9002', now, now],
      ['EMP-003', 'Rachel', 'Green', 'rachel.green@example.com', '+1 555-0103', 3, 'Inventory & Warehouse', 3, 'Warehouse Manager', 1, 'Morning General', '2023-03-20', 52000, 'FULL_TIME', 'ACTIVE', '789 Logistics Way', '+1 555-9003', now, now],
      ['EMP-004', 'James', 'Wilson', 'james.wilson@example.com', '+1 555-0104', 4, 'Human Resources', 4, 'HR Executive', 1, 'Morning General', '2023-08-01', 48000, 'FULL_TIME', 'ACTIVE', '321 People Blvd', '+1 555-9004', now, now],
      ['EMP-005', 'Sophia', 'Taylor', 'sophia.taylor@example.com', '+1 555-0105', 1, 'Sales & Marketing', 5, 'Store Supervisor', 2, 'Early Shift', '2024-02-15', 42000, 'FULL_TIME', 'ON_LEAVE', '654 Retail Road', '+1 555-9005', now, now],
    ];
    for (const e of emps) {
      await db.execute(
        'INSERT INTO employees (employeeCode, firstName, lastName, email, phone, departmentId, departmentName, designationId, designationName, shiftId, shiftName, joiningDate, salary, employmentType, status, address, emergencyContact, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        e
      );
    }

    // Default Leave Types
    const ltypes = [
      ['Casual Leave', 12, 'Paid leave for personal matters', 'ACTIVE', now, now],
      ['Sick Leave', 10, 'Medical and sickness leave with certificate', 'ACTIVE', now, now],
      ['Annual Privilege Leave', 15, 'Earned annual paid time off', 'ACTIVE', now, now],
      ['Maternity / Paternity Leave', 90, 'Parental care leave', 'ACTIVE', now, now],
    ];
    for (const lt of ltypes) {
      await db.execute(
        'INSERT INTO leave_types (name, daysAllowed, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?);',
        lt
      );
    }

    // Default Holidays
    const hols = [
      ['New Year\'s Day', '2026-01-01', 'Thursday', 'PUBLIC', 'National holiday celebration', 'ACTIVE', now, now],
      ['Labor Day', '2026-05-01', 'Friday', 'PUBLIC', 'International workers day', 'ACTIVE', now, now],
      ['Independence Day', '2026-07-04', 'Saturday', 'PUBLIC', 'National independence commemoration', 'ACTIVE', now, now],
      ['Company Foundation Day', '2026-10-15', 'Thursday', 'COMPANY', 'Annual corporate anniversary', 'ACTIVE', now, now],
      ['Christmas Day', '2026-12-25', 'Friday', 'PUBLIC', 'Christmas festival celebration', 'ACTIVE', now, now],
    ];
    for (const h of hols) {
      await db.execute(
        'INSERT INTO holidays (name, date, dayOfWeek, type, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?);',
        h
      );
    }

    // Default Attendances for today
    const today = new Date().toISOString().split('T')[0];
    const atts = [
      [1, 'Alex Morgan', 'Sales & Marketing', today, '09:02', '18:05', 'PRESENT', 9.0, 'On time', now, now],
      [2, 'David Miller', 'Accounts & Finance', today, '09:12', '18:10', 'PRESENT', 8.9, 'On time', now, now],
      [3, 'Rachel Green', 'Inventory & Warehouse', today, '09:35', '18:15', 'LATE', 8.6, 'Traffic delay', now, now],
      [4, 'James Wilson', 'Human Resources', today, '08:58', '18:00', 'PRESENT', 9.0, 'Regular shift', now, now],
      [5, 'Sophia Taylor', 'Sales & Marketing', today, null, null, 'ON_LEAVE', 0, 'Medical leave approved', now, now],
    ];
    for (const a of atts) {
      await db.execute(
        'INSERT INTO attendances (employeeId, employeeName, departmentName, date, clockIn, clockOut, status, totalHours, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        a
      );
    }

    // Default Leave Requests
    const lreqs = [
      [5, 'Sophia Taylor', 'Sales & Marketing', 2, 'Sick Leave', today, today, 1, 'Doctor appointment and recovery', 'APPROVED', now, now, now],
      [1, 'Alex Morgan', 'Sales & Marketing', 1, 'Casual Leave', '2026-11-10', '2026-11-12', 3, 'Family event travel', 'PENDING', now, now, now],
    ];
    for (const lr of lreqs) {
      await db.execute(
        'INSERT INTO leaves (employeeId, employeeName, departmentName, leaveTypeId, leaveTypeName, startDate, endDate, totalDays, reason, status, appliedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        lr
      );
    }

    // Default Payroll
    const pays = [
      [1, 'Alex Morgan', 'Sales & Marketing', 'Sales Executive', 'October', 2026, 45000, 3500, 2000, 46500, today, 'BANK_TRANSFER', 'PAID', 'Disbursed via Direct Deposit', now, now],
      [2, 'David Miller', 'Accounts & Finance', 'Senior Accountant', 'October', 2026, 58000, 4000, 3000, 59000, today, 'BANK_TRANSFER', 'PAID', 'Disbursed via Direct Deposit', now, now],
      [3, 'Rachel Green', 'Inventory & Warehouse', 'Warehouse Manager', 'October', 2026, 52000, 3000, 2500, 52500, null, null, 'GENERATED', 'Generated pending approval', now, now],
      [4, 'James Wilson', 'Human Resources', 'HR Executive', 'October', 2026, 48000, 2500, 2000, 48500, null, null, 'PENDING', 'Draft payroll', now, now],
    ];
    for (const p of pays) {
      await db.execute(
        'INSERT INTO payrolls (employeeId, employeeName, departmentName, designationName, month, year, basicSalary, allowances, deductions, netSalary, paymentDate, paymentMethod, status, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        p
      );
    }
  } catch (err) {
    console.warn('Could not seed HRM defaults:', err);
  }
};




