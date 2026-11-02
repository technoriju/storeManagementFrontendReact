import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingRepository } from '../../../core/repositories/SettingRepository';

export interface ShortcutItem {
  id: string;
  actionId: string;
  label: string;
  category: 'Main' | 'Sales' | 'Inventory' | 'Stock' | 'Purchases' | 'Finance' | 'Peoples' | 'HRM' | 'Reports' | 'Settings' | 'User Management' | 'Custom';
  description?: string;
  key: string; // e.g. 'D', 'S', 'F2', '/'
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey?: boolean;
  enabled: boolean;
  isCustom?: boolean;
}

export interface AvailableModule {
  id: string;
  label: string;
  category: ShortcutItem['category'];
  description: string;
}

export const AVAILABLE_MODULES: AvailableModule[] = [
  // Main
  { id: 'dashboard', label: 'Dashboard', category: 'Main', description: 'Overview and analytics dashboard' },
  
  // Sales
  { id: 'pos', label: 'POS / Sales', category: 'Sales', description: 'Point of sale terminal' },
  { id: 'invoices', label: 'Invoices', category: 'Sales', description: 'View and manage sales invoices' },
  { id: 'quotation', label: 'Quotation', category: 'Sales', description: 'Price estimates and quotations' },
  { id: 'sales_return', label: 'Sales Return', category: 'Sales', description: 'Customer returns management' },
  
  // Inventory
  { id: 'products', label: 'Products', category: 'Inventory', description: 'Product list and inventory items' },
  { id: 'add_product', label: 'Add Product', category: 'Inventory', description: 'Create new product item' },
  { id: 'low_stocks', label: 'Low Stocks', category: 'Inventory', description: 'Items needing replenishment' },
  { id: 'expired_products', label: 'Expired Products', category: 'Inventory', description: 'Expired inventory alerts' },
  { id: 'category', label: 'Category', category: 'Inventory', description: 'Product categories' },
  { id: 'sub_category', label: 'Sub Category', category: 'Inventory', description: 'Product subcategories' },
  { id: 'brands', label: 'Brands', category: 'Inventory', description: 'Product brands' },
  { id: 'units', label: 'Units', category: 'Inventory', description: 'Measurement units' },
  { id: 'sub_units', label: 'Sub Units', category: 'Inventory', description: 'Secondary measurement units' },
  { id: 'print_barcode', label: 'Print Barcode', category: 'Inventory', description: 'Generate and print product barcodes' },
  { id: 'print_qr_code', label: 'Print QR Code', category: 'Inventory', description: 'Generate and print product QR codes' },
  
  // Stock
  { id: 'manage_stock', label: 'Manage Stock', category: 'Stock', description: 'Stock levels and tracking' },
  { id: 'stock_adjustment', label: 'Stock Adjustment', category: 'Stock', description: 'Manual stock corrections' },
  { id: 'stock_transfer', label: 'Stock Transfer', category: 'Stock', description: 'Transfer stock between locations' },
  
  // Purchases
  { id: 'purchases', label: 'Purchases', category: 'Purchases', description: 'Purchase orders and receipts' },
  { id: 'purchase_order', label: 'Purchase Order', category: 'Purchases', description: 'Create purchase orders' },
  { id: 'purchase_return', label: 'Purchase Return', category: 'Purchases', description: 'Vendor returns management' },
  
  // Peoples
  { id: 'customers', label: 'Customers', category: 'Peoples', description: 'Customer directory and contacts' },
  { id: 'customer_payment', label: 'Customer Payment', category: 'Peoples', description: 'Record customer receipt payments' },
  { id: 'suppliers', label: 'Suppliers', category: 'Peoples', description: 'Supplier/vendor directory' },
  { id: 'supplier_payment', label: 'Supplier Payment', category: 'Peoples', description: 'Record payments to suppliers' },
  { id: 'stores', label: 'Stores', category: 'Peoples', description: 'Store branches' },
  { id: 'warehouses', label: 'Warehouses', category: 'Peoples', description: 'Warehouse locations' },
  
  // Finance & Accounts
  { id: 'expenses', label: 'Expenses', category: 'Finance', description: 'Business expense tracker' },
  { id: 'expense_category', label: 'Expense Category', category: 'Finance', description: 'Manage expense categories' },
  { id: 'income', label: 'Income', category: 'Finance', description: 'Other income entries' },
  { id: 'bank_accounts', label: 'Bank Accounts', category: 'Finance', description: 'Bank and cash accounts' },
  { id: 'money_transfer', label: 'Money Transfer', category: 'Finance', description: 'Inter-account fund transfers' },
  { id: 'balance_sheet', label: 'Balance Sheet', category: 'Finance', description: 'Financial balance sheet' },
  { id: 'trial_balance', label: 'Trial Balance', category: 'Finance', description: 'Trial balance report' },
  { id: 'cash_flow', label: 'Cash Flow', category: 'Finance', description: 'Cash flow statement' },
  
  // HRM
  { id: 'employees', label: 'Employees', category: 'HRM', description: 'Staff directory' },
  { id: 'add_employee', label: 'Add Employee', category: 'HRM', description: 'Register new employee' },
  { id: 'attendance', label: 'Attendance', category: 'HRM', description: 'Daily employee attendance' },
  { id: 'leaves', label: 'Leaves', category: 'HRM', description: 'Leave requests and tracking' },
  { id: 'holidays', label: 'Holidays', category: 'HRM', description: 'Company holiday calendar' },
  { id: 'payroll', label: 'Payroll', category: 'HRM', description: 'Salary and payroll processing' },
  
  // Reports
  { id: 'sales_report', label: 'Sales Report', category: 'Reports', description: 'Detailed sales performance' },
  { id: 'customer_wise', label: 'Customer-Wise Report', category: 'Reports', description: 'Sales by customer' },
  { id: 'purchase_report', label: 'Purchase Report', category: 'Reports', description: 'Purchase summary' },
  { id: 'supplier_wise', label: 'Supplier-Wise Report', category: 'Reports', description: 'Purchases by supplier' },
  { id: 'inventory_report', label: 'Inventory Report', category: 'Reports', description: 'Current stock audit' },
  { id: 'invoice_report', label: 'Invoice Report', category: 'Reports', description: 'All generated invoices' },
  { id: 'profit_loss', label: 'Profit & Loss', category: 'Reports', description: 'Profit and loss statements' },
  
  // User Management
  { id: 'users', label: 'Users', category: 'User Management', description: 'System user accounts' },
  { id: 'roles_permissions', label: 'Roles & Permissions', category: 'User Management', description: 'Access control and roles' },
  { id: 'sync_queue', label: 'Sync Queue', category: 'User Management', description: 'Offline synchronization status' },
  
  // Settings
  { id: 'settings', label: 'Settings', category: 'Settings', description: 'System configuration' },
  { id: 'invoice_preview', label: 'Invoice Preview', category: 'Settings', description: 'Invoice template preview' },
  { id: 'invoice', label: 'Invoice Format', category: 'Settings', description: 'Customize print format and layout' },
  { id: 'business', label: 'Business Profile', category: 'Settings', description: 'Business name, address, tax details' },
  { id: 'printers', label: 'Printers', category: 'Settings', description: 'Receipt and thermal printer settings' },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', category: 'Settings', description: 'Manage module keyboard shortcut hotkeys' },
];

export const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  // Main
  {
    id: 'sc_dashboard',
    actionId: 'dashboard',
    label: 'Dashboard',
    category: 'Main',
    description: 'Jump to main dashboard overview',
    key: 'D',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  
  // Sales
  {
    id: 'sc_pos',
    actionId: 'pos',
    label: 'POS / Sales',
    category: 'Sales',
    description: 'Open sales billing / POS terminal',
    key: 'S',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  {
    id: 'sc_invoices',
    actionId: 'invoices',
    label: 'Invoices',
    category: 'Sales',
    description: 'Open invoice history and receipts',
    key: 'B',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  {
    id: 'sc_quotation',
    actionId: 'quotation',
    label: 'Quotation',
    category: 'Sales',
    description: 'Create or view quotations',
    key: 'Q',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  {
    id: 'sc_sales_return',
    actionId: 'sales_return',
    label: 'Sales Return',
    category: 'Sales',
    description: 'Process product return from customer',
    key: 'R',
    altKey: true,
    ctrlKey: false,
    shiftKey: true,
    enabled: true,
  },
  
  // Inventory & Stock
  {
    id: 'sc_products',
    actionId: 'products',
    label: 'Products',
    category: 'Inventory',
    description: 'View products inventory catalogue',
    key: 'P',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  {
    id: 'sc_add_product',
    actionId: 'add_product',
    label: 'Add Product',
    category: 'Inventory',
    description: 'Quickly create new inventory item',
    key: 'N',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  {
    id: 'sc_manage_stock',
    actionId: 'manage_stock',
    label: 'Manage Stock',
    category: 'Stock',
    description: 'Inspect stock balance and quantity',
    key: 'M',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  {
    id: 'sc_stock_adjustment',
    actionId: 'stock_adjustment',
    label: 'Stock Adjustment',
    category: 'Stock',
    description: 'Perform stock count adjustment',
    key: 'J',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  {
    id: 'sc_low_stocks',
    actionId: 'low_stocks',
    label: 'Low Stocks',
    category: 'Inventory',
    description: 'Review low stock warnings',
    key: 'L',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  {
    id: 'sc_category',
    actionId: 'category',
    label: 'Category',
    category: 'Inventory',
    description: 'Manage product categories',
    key: 'G',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  {
    id: 'sc_print_barcode',
    actionId: 'print_barcode',
    label: 'Print Barcode',
    category: 'Inventory',
    description: 'Print barcode labels for items',
    key: 'C',
    altKey: true,
    ctrlKey: false,
    shiftKey: true,
    enabled: true,
  },
  
  // Purchases
  {
    id: 'sc_purchases',
    actionId: 'purchases',
    label: 'Purchases',
    category: 'Purchases',
    description: 'View vendor purchase orders',
    key: 'U',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  {
    id: 'sc_purchase_order',
    actionId: 'purchase_order',
    label: 'Purchase Order',
    category: 'Purchases',
    description: 'Create purchase order for supplier',
    key: 'O',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  
  // Peoples
  {
    id: 'sc_customers',
    actionId: 'customers',
    label: 'Customers',
    category: 'Peoples',
    description: 'Search and manage customer directory',
    key: 'C',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  {
    id: 'sc_customer_payment',
    actionId: 'customer_payment',
    label: 'Customer Payment',
    category: 'Peoples',
    description: 'Record received customer payment',
    key: 'M',
    altKey: true,
    ctrlKey: false,
    shiftKey: true,
    enabled: true,
  },
  {
    id: 'sc_suppliers',
    actionId: 'suppliers',
    label: 'Suppliers',
    category: 'Peoples',
    description: 'Search and manage suppliers/vendors',
    key: 'V',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  {
    id: 'sc_supplier_payment',
    actionId: 'supplier_payment',
    label: 'Supplier Payment',
    category: 'Peoples',
    description: 'Record payment given to vendor',
    key: 'V',
    altKey: true,
    ctrlKey: false,
    shiftKey: true,
    enabled: true,
  },
  
  // Finance & Accounts
  {
    id: 'sc_expenses',
    actionId: 'expenses',
    label: 'Expenses',
    category: 'Finance',
    description: 'View and log daily operational expenses',
    key: 'E',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  {
    id: 'sc_income',
    actionId: 'income',
    label: 'Income',
    category: 'Finance',
    description: 'Record non-sales income',
    key: 'I',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  
  // HRM
  {
    id: 'sc_employees',
    actionId: 'employees',
    label: 'Employees',
    category: 'HRM',
    description: 'Manage staff and workers',
    key: 'E',
    altKey: true,
    ctrlKey: false,
    shiftKey: true,
    enabled: true,
  },
  {
    id: 'sc_attendance',
    actionId: 'attendance',
    label: 'Attendance',
    category: 'HRM',
    description: 'Employee punch & attendance record',
    key: 'A',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  
  // Reports
  {
    id: 'sc_sales_report',
    actionId: 'sales_report',
    label: 'Sales Report',
    category: 'Reports',
    description: 'Review analytical sales reports',
    key: 'T',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  
  // User Management
  {
    id: 'sc_sync_queue',
    actionId: 'sync_queue',
    label: 'Sync Queue',
    category: 'User Management',
    description: 'Inspect offline data synchronization',
    key: 'Y',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  
  // Settings
  {
    id: 'sc_settings',
    actionId: 'settings',
    label: 'Settings',
    category: 'Settings',
    description: 'Open general settings',
    key: 'K',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
  {
    id: 'sc_shortcuts',
    actionId: 'shortcuts',
    label: 'Keyboard Shortcuts',
    category: 'Settings',
    description: 'Configure and view hotkeys',
    key: '/',
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    enabled: true,
  },
];

export const formatShortcutKey = (
  shortcut: Pick<ShortcutItem, 'key' | 'altKey' | 'ctrlKey' | 'shiftKey' | 'metaKey'>
): string => {
  const parts: string[] = [];
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.metaKey) parts.push('Cmd');
  
  let keyDisplay = shortcut.key.toUpperCase();
  if (keyDisplay === ' ') keyDisplay = 'Space';
  parts.push(keyDisplay);
  
  return parts.join(' + ');
};

export const normalizeKey = (key: string): string => {
  if (!key) return '';
  const trimmed = key.trim();
  if (/^f[0-9]{1,2}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  if (trimmed === ' ') return 'Space';
  return trimmed.toUpperCase();
};

export interface ShortcutConflict {
  hasConflict: boolean;
  conflictItem?: ShortcutItem;
}

interface ShortcutSettingsState {
  shortcuts: ShortcutItem[];
  showShortcutBadges: boolean;
  addShortcut: (shortcut: Omit<ShortcutItem, 'id'>) => { success: boolean; error?: string };
  updateShortcut: (id: string, updates: Partial<ShortcutItem>) => { success: boolean; error?: string };
  deleteShortcut: (id: string) => void;
  toggleShortcut: (id: string, enabled?: boolean) => void;
  setShowShortcutBadges: (show: boolean) => void;
  resetToDefaults: () => void;
  checkConflict: (
    key: string,
    modifiers: { altKey: boolean; ctrlKey: boolean; shiftKey: boolean; metaKey?: boolean },
    excludeId?: string
  ) => ShortcutConflict;
  getShortcutBadgeForAction: (actionId: string) => string | null;
}

export const useShortcutSettingsStore = create<ShortcutSettingsState>()(
  persist(
    (set, get) => ({
      shortcuts: DEFAULT_SHORTCUTS,
      showShortcutBadges: true,

      checkConflict: (key, modifiers, excludeId) => {
        const normKey = normalizeKey(key);
        const { shortcuts } = get();
        const found = shortcuts.find(
          (s) =>
            s.id !== excludeId &&
            s.enabled &&
            normalizeKey(s.key) === normKey &&
            Boolean(s.altKey) === Boolean(modifiers.altKey) &&
            Boolean(s.ctrlKey) === Boolean(modifiers.ctrlKey) &&
            Boolean(s.shiftKey) === Boolean(modifiers.shiftKey) &&
            Boolean(s.metaKey) === Boolean(modifiers.metaKey)
        );
        return {
          hasConflict: !!found,
          conflictItem: found,
        };
      },

      addShortcut: (shortcutData) => {
        const normKey = normalizeKey(shortcutData.key);
        if (!normKey) {
          return { success: false, error: 'A key must be specified' };
        }
        if (!shortcutData.altKey && !shortcutData.ctrlKey && !/^F[0-9]{1,2}$/i.test(normKey)) {
          return { success: false, error: 'Please use at least Alt, Ctrl, or a Function key (F1-F12) to avoid typing conflicts.' };
        }

        const conflict = get().checkConflict(normKey, {
          altKey: shortcutData.altKey,
          ctrlKey: shortcutData.ctrlKey,
          shiftKey: shortcutData.shiftKey,
          metaKey: shortcutData.metaKey,
        });

        if (conflict.hasConflict && conflict.conflictItem) {
          return {
            success: false,
            error: `Key combination already used by "${conflict.conflictItem.label}"`,
          };
        }

        const newId = `sc_custom_${Date.now()}`;
        const newShortcut: ShortcutItem = {
          ...shortcutData,
          id: newId,
          key: normKey,
          isCustom: true,
          enabled: true,
        };

        const updated = [...get().shortcuts, newShortcut];
        set({ shortcuts: updated });
        settingRepository.set('app_keyboard_shortcuts', JSON.stringify(updated)).catch(console.error);

        return { success: true };
      },

      updateShortcut: (id, updates) => {
        const existing = get().shortcuts.find((s) => s.id === id);
        if (!existing) {
          return { success: false, error: 'Shortcut not found' };
        }

        const targetKey = updates.key ? normalizeKey(updates.key) : existing.key;
        const targetAlt = updates.altKey !== undefined ? updates.altKey : existing.altKey;
        const targetCtrl = updates.ctrlKey !== undefined ? updates.ctrlKey : existing.ctrlKey;
        const targetShift = updates.shiftKey !== undefined ? updates.shiftKey : existing.shiftKey;
        const targetMeta = updates.metaKey !== undefined ? updates.metaKey : existing.metaKey;

        if (updates.key || updates.altKey !== undefined || updates.ctrlKey !== undefined || updates.shiftKey !== undefined) {
          if (!targetAlt && !targetCtrl && !/^F[0-9]{1,2}$/i.test(targetKey)) {
            return { success: false, error: 'Please use at least Alt, Ctrl, or a Function key (F1-F12) to avoid typing conflicts.' };
          }

          const conflict = get().checkConflict(
            targetKey,
            { altKey: targetAlt, ctrlKey: targetCtrl, shiftKey: targetShift, metaKey: targetMeta },
            id
          );

          if (conflict.hasConflict && conflict.conflictItem) {
            return {
              success: false,
              error: `Key combination already used by "${conflict.conflictItem.label}"`,
            };
          }
        }

        const updatedList = get().shortcuts.map((s) => {
          if (s.id !== id) return s;
          return {
            ...s,
            ...updates,
            key: targetKey,
            isCustom: s.isCustom || true,
          };
        });

        set({ shortcuts: updatedList });
        settingRepository.set('app_keyboard_shortcuts', JSON.stringify(updatedList)).catch(console.error);

        return { success: true };
      },

      deleteShortcut: (id) => {
        const updated = get().shortcuts.filter((s) => s.id !== id);
        set({ shortcuts: updated });
        settingRepository.set('app_keyboard_shortcuts', JSON.stringify(updated)).catch(console.error);
      },

      toggleShortcut: (id, enabled) => {
        const updated = get().shortcuts.map((s) => {
          if (s.id !== id) return s;
          return {
            ...s,
            enabled: enabled !== undefined ? enabled : !s.enabled,
          };
        });
        set({ shortcuts: updated });
        settingRepository.set('app_keyboard_shortcuts', JSON.stringify(updated)).catch(console.error);
      },

      setShowShortcutBadges: (show) => {
        set({ showShortcutBadges: show });
        settingRepository.set('app_show_shortcut_badges', String(show)).catch(console.error);
      },

      resetToDefaults: () => {
        set({ shortcuts: DEFAULT_SHORTCUTS });
        settingRepository.set('app_keyboard_shortcuts', JSON.stringify(DEFAULT_SHORTCUTS)).catch(console.error);
      },

      getShortcutBadgeForAction: (actionId) => {
        if (!get().showShortcutBadges) return null;
        // Normalize alias mappings
        const targetId = actionId === 'create_product' ? 'add_product' : actionId === 'sales' ? 'pos' : actionId;
        const item = get().shortcuts.find((s) => s.actionId === targetId && s.enabled);
        if (!item) return null;
        return formatShortcutKey(item);
      },
    }),
    {
      name: 'shortcut-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
