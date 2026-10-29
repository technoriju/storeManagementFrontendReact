import { useAuthStore } from './auth.store';

/**
 * Checks whether the given list of user permissions satisfies the required permission(s).
 * Handles global wildcard '*', module wildcards like 'users:*', and exact matches.
 */
export function hasPermission(
  userPermissions: string[] | undefined | null,
  requiredPermission?: string | string[],
  userRole?: string
): boolean {
  if (!requiredPermission) return true;

  // Super Admin wildcard override
  if (userRole) {
    const roleLower = userRole.toLowerCase();
    if (roleLower === 'super admin' || roleLower === 'superadmin') {
      return true;
    }
  }

  if (!userPermissions || userPermissions.length === 0) return false;

  // Wildcard check
  if (userPermissions.includes('*') || userPermissions.includes('*:*')) {
    return true;
  }

  const requiredList = Array.isArray(requiredPermission)
    ? requiredPermission
    : [requiredPermission];

  return requiredList.some((required) => {
    if (userPermissions.includes(required)) return true;

    // Check module wildcard, e.g. "users:*" satisfies "users:view"
    const [moduleName] = required.split(':');
    if (moduleName && userPermissions.includes(`${moduleName}:*`)) {
      return true;
    }

    return false;
  });
}

/**
 * React hook to evaluate permission rules against current authenticated user.
 */
export const usePermissions = () => {
  const permissions = useAuthStore((state) => state.permissions) || [];
  const user = useAuthStore((state) => state.user);

  const roleName = (user?.role || '').toLowerCase();
  const isSuperAdmin =
    roleName === 'super admin' ||
    roleName === 'superadmin' ||
    permissions.includes('*') ||
    permissions.includes('*:*');

  const can = (permission: string): boolean => {
    if (isSuperAdmin) return true;
    return hasPermission(permissions, permission, user?.role);
  };

  const canAny = (permissionList: string[]): boolean => {
    if (isSuperAdmin) return true;
    if (!permissionList || permissionList.length === 0) return true;
    return permissionList.some((perm) => hasPermission(permissions, perm, user?.role));
  };

  const canAll = (permissionList: string[]): boolean => {
    if (isSuperAdmin) return true;
    if (!permissionList || permissionList.length === 0) return true;
    return permissionList.every((perm) => hasPermission(permissions, perm, user?.role));
  };

  return {
    permissions,
    isAdmin: isSuperAdmin,
    isSuperAdmin,
    userRole: user?.role,
    can,
    canAny,
    canAll,
  };
};
