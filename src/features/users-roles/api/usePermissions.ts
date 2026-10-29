import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/api-client';
import { API_ENDPOINTS } from '../../../core/api/api-urls';
import { Permission } from '../../../types/models';

export interface PermissionModuleGroup {
  module: string;
  title: string;
  permissions: Permission[];
}

export const DEFAULT_PERMISSIONS: Permission[] = [
  // Dashboard
  { id: 1, action: 'dashboard:view', description: 'View dashboard metrics & KPIs', module: 'Dashboard' },

  // Inventory
  { id: 10, action: 'inventory:view', description: 'View products and inventory', module: 'Inventory' },
  { id: 11, action: 'inventory:create', description: 'Create new products', module: 'Inventory' },
  { id: 12, action: 'inventory:edit', description: 'Edit existing products', module: 'Inventory' },
  { id: 13, action: 'inventory:delete', description: 'Delete products', module: 'Inventory' },

  // Stock
  { id: 20, action: 'stock:manage', description: 'Manage stocks and adjustments', module: 'Stock' },
  { id: 21, action: 'stock:adjustment', description: 'Perform stock adjustments', module: 'Stock' },
  { id: 22, action: 'stock:transfer', description: 'Transfer stock between locations', module: 'Stock' },

  // Sales
  { id: 30, action: 'sales:view', description: 'View sales and invoices', module: 'Sales' },
  { id: 31, action: 'sales:create', description: 'Create new sales and invoices', module: 'Sales' },
  { id: 32, action: 'sales:edit', description: 'Edit sales & return transactions', module: 'Sales' },
  { id: 33, action: 'sales:delete', description: 'Delete sales records', module: 'Sales' },
  { id: 34, action: 'sales:pos', description: 'Access POS terminal', module: 'Sales' },

  // Purchases
  { id: 40, action: 'purchases:view', description: 'View purchases & purchase orders', module: 'Purchases' },
  { id: 41, action: 'purchases:create', description: 'Create purchase orders', module: 'Purchases' },
  { id: 42, action: 'purchases:edit', description: 'Edit purchases & purchase returns', module: 'Purchases' },
  { id: 43, action: 'purchases:delete', description: 'Delete purchase records', module: 'Purchases' },

  // Finance
  { id: 50, action: 'finance:view', description: 'View expenses, income, and banking', module: 'Finance' },
  { id: 51, action: 'finance:create', description: 'Record expenses and income', module: 'Finance' },
  { id: 52, action: 'finance:edit', description: 'Edit finance and banking entries', module: 'Finance' },
  { id: 53, action: 'finance:delete', description: 'Delete financial transactions', module: 'Finance' },

  // Peoples (Customers & Suppliers)
  { id: 60, action: 'customers:manage', description: 'Manage customers and customer payments', module: 'Peoples' },
  { id: 61, action: 'suppliers:manage', description: 'Manage suppliers and supplier payments', module: 'Peoples' },

  // HRM
  { id: 70, action: 'hrm:view', description: 'View employees, departments, and shifts', module: 'HRM' },
  { id: 71, action: 'hrm:employees', description: 'Manage employees list and details', module: 'HRM' },
  { id: 72, action: 'hrm:attendance', description: 'Track attendance and leave requests', module: 'HRM' },
  { id: 73, action: 'hrm:payroll', description: 'Process payroll and view salary lists', module: 'HRM' },

  // Reports
  { id: 80, action: 'reports:view', description: 'Access and view all reports', module: 'Reports' },
  { id: 81, action: 'reports:export', description: 'Export report data and statements', module: 'Reports' },

  // Users
  { id: 90, action: 'users:view', description: 'View users list', module: 'Users' },
  { id: 91, action: 'users:create', description: 'Create new users', module: 'Users' },
  { id: 92, action: 'users:edit', description: 'Edit users and reset passwords', module: 'Users' },
  { id: 93, action: 'users:delete', description: 'Delete or deactivate users', module: 'Users' },

  // Roles
  { id: 100, action: 'roles:view', description: 'View roles and permissions', module: 'Roles' },
  { id: 101, action: 'roles:create', description: 'Create new custom roles', module: 'Roles' },
  { id: 102, action: 'roles:edit', description: 'Edit roles and assign permissions', module: 'Roles' },
  { id: 103, action: 'roles:delete', description: 'Delete roles', module: 'Roles' },

  // Settings
  { id: 110, action: 'settings:general', description: 'Manage company & system settings', module: 'Settings' },
  { id: 111, action: 'settings:invoice', description: 'Customize invoice templates and formats', module: 'Settings' },
  { id: 112, action: 'settings:printers', description: 'Configure thermal & network printers', module: 'Settings' },
];

export const PERMISSIONS_QUERY_KEY = ['permissions'];
export const PERMISSION_MODULES_QUERY_KEY = ['permissions', 'modules'];

export const usePermissionsList = () => {
  return useQuery<Permission[]>({
    queryKey: PERMISSIONS_QUERY_KEY,
    queryFn: async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.PERMISSIONS.BASE);
        const data = res.data?.data || res.data;
        if (Array.isArray(data) && data.length > 0) {
          return data.map((p: any) => ({
            id: p.id,
            action: p.action || p.name || '',
            description: p.description || '',
            module: p.module || (p.action ? p.action.split(':')[0].toUpperCase() : 'GENERAL'),
          }));
        }
      } catch (err) {
        // Fallback to default permissions list
      }
      return DEFAULT_PERMISSIONS;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const usePermissionModules = () => {
  const { data: allPermissions = [], isLoading } = usePermissionsList();

  const groupedModules: PermissionModuleGroup[] = [];
  const map = new Map<string, Permission[]>();

  for (const perm of allPermissions) {
    const mod = perm.module || (perm.action ? perm.action.split(':')[0].toUpperCase() : 'GENERAL');
    if (!map.has(mod)) {
      map.set(mod, []);
    }
    map.get(mod)!.push(perm);
  }

  for (const [module, perms] of map.entries()) {
    groupedModules.push({
      module,
      title: module,
      permissions: perms,
    });
  }

  return {
    data: groupedModules,
    isLoading,
  };
};
