export const SETTINGS_PERMISSIONS = {
  VIEW_USERS: 'view_users',
  VIEW_ROLES: 'view_roles',
  VIEW_PERMISSIONS: 'view_permissions',
  VIEW_BRANCHES: 'view_branches',
  VIEW_WAREHOUSES: 'view_warehouses',
  VIEW_BUSINESS: 'view_business',
  VIEW_GST: 'view_gst',
  VIEW_PRINTERS: 'view_printers',
  VIEW_INVOICE: 'view_invoice',
  VIEW_SYNC: 'view_sync',
};

export const hasPermission = (userPermissions: string[], permission: string) => {
  // Development fallback: if no permissions are loaded, allow all to view the UI.
  if (!userPermissions || userPermissions.length === 0) return true;
  
  if (userPermissions.includes('*')) return true;
  return userPermissions.includes(permission);
};
