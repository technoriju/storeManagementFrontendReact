import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/api-client';
import { API_ENDPOINTS } from '../../../core/api/api-urls';
import { AuthService } from '../../../core/auth/auth.service';
import { Role } from '../../../types/models';

export const ROLES_QUERY_KEY = ['roles'];

export const DEFAULT_ROLES: Role[] = [
  {
    id: 1,
    name: 'Super Admin',
    description: 'Full administrative access to all modules and configurations',
    status: 'ACTIVE',
    permissions: ['*'],
    permissionCount: 30,
    userCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Admin',
    description: 'Administrator with full management access across branches',
    status: 'ACTIVE',
    permissions: [
      'dashboard:view',
      'inventory:view', 'inventory:create', 'inventory:edit',
      'stock:manage', 'stock:adjustment', 'stock:transfer',
      'sales:view', 'sales:create', 'sales:edit', 'sales:pos',
      'purchases:view', 'purchases:create', 'purchases:edit',
      'finance:view', 'finance:create',
      'customers:manage', 'suppliers:manage',
      'hrm:view', 'hrm:employees', 'hrm:attendance',
      'reports:view', 'reports:export',
      'users:view', 'users:create', 'users:edit',
      'roles:view',
      'settings:general', 'settings:invoice',
    ],
    permissionCount: 22,
    userCount: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Store Manager',
    description: 'Manages inventory, stock movements, and store operations',
    status: 'ACTIVE',
    permissions: [
      'dashboard:view',
      'inventory:view', 'inventory:create', 'inventory:edit',
      'stock:manage', 'stock:adjustment', 'stock:transfer',
      'sales:view', 'sales:create', 'sales:pos',
      'purchases:view', 'purchases:create',
      'customers:manage', 'suppliers:manage',
      'reports:view',
    ],
    permissionCount: 14,
    userCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    name: 'Cashier / POS Operator',
    description: 'Operates Point of Sale terminal, handles receipts and customer checkouts',
    status: 'ACTIVE',
    permissions: [
      'dashboard:view',
      'sales:view', 'sales:create', 'sales:pos',
      'customers:manage',
    ],
    permissionCount: 5,
    userCount: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let localRoles: Role[] = [...DEFAULT_ROLES];

export const useRoles = () => {
  return useQuery<Role[]>({
    queryKey: ROLES_QUERY_KEY,
    queryFn: async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.ROLES.BASE);
        const data = res.data?.data || res.data;
        if (Array.isArray(data) && data.length > 0) {
          localRoles = data.map((r: any) => {
            const rawPerms = r.permissions || [];
            const actionStrings = Array.isArray(rawPerms)
              ? rawPerms.map((p: any) => (typeof p === 'string' ? p : p.action || p.permission?.action)).filter(Boolean)
              : [];
            return {
              id: r.id,
              name: r.name,
              description: r.description || '',
              status: r.status || 'ACTIVE',
              permissions: actionStrings,
              permissionCount: actionStrings.length,
              userCount: r._count?.users || r.usersCount || r.userCount || 0,
              createdAt: r.createdAt || new Date().toISOString(),
              updatedAt: r.updatedAt || new Date().toISOString(),
            };
          });
          return localRoles;
        }
      } catch (err) {
        // Fallback to local memory / default roles
      }
      return localRoles;
    },
  });
};

export const useRole = (roleId?: number) => {
  return useQuery<Role | null>({
    queryKey: [...ROLES_QUERY_KEY, roleId],
    queryFn: async () => {
      if (!roleId) return null;
      try {
        const res = await apiClient.get(API_ENDPOINTS.ROLES.BY_ID(roleId));
        const r = res.data?.data || res.data;
        if (r) {
          const rawPerms = r.permissions || [];
          const actionStrings = Array.isArray(rawPerms)
            ? rawPerms.map((p: any) => (typeof p === 'string' ? p : p.action || p.permission?.action)).filter(Boolean)
            : [];
          return {
            ...r,
            permissions: actionStrings,
            permissionCount: actionStrings.length,
          };
        }
      } catch (err) {
        return localRoles.find((r) => r.id === roleId) || null;
      }
      return localRoles.find((r) => r.id === roleId) || null;
    },
    enabled: !!roleId,
  });
};

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions: string[];
}

export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRoleInput) => {
      const newRole: Role = {
        id: Date.now(),
        name: input.name,
        description: input.description || '',
        status: 'ACTIVE',
        permissions: input.permissions,
        permissionCount: input.permissions.length,
        userCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        const res = await apiClient.post(API_ENDPOINTS.ROLES.BASE, {
          name: input.name,
          description: input.description,
          permissions: input.permissions,
        });
        const saved = res.data?.data || res.data;
        if (saved?.id) {
          newRole.id = saved.id;
          if (saved.permissions) {
            newRole.permissions = Array.isArray(saved.permissions)
              ? saved.permissions.map((p: any) => (typeof p === 'string' ? p : p.action || p.permission?.action)).filter(Boolean)
              : input.permissions;
            newRole.permissionCount = newRole.permissions.length;
          }
        }
      } catch (err) {
        // Fallback to local
      }

      localRoles = [newRole, ...localRoles];
      return newRole;
    },
    onSuccess: (newRole) => {
      queryClient.setQueryData<Role[]>(ROLES_QUERY_KEY, (old = []) => [newRole, ...old]);
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      AuthService.loadPermissions();
    },
  });
};

export interface UpdateRoleInput {
  id: number;
  name?: string;
  description?: string;
  status?: string;
  permissions?: string[];
}

export const useUpdateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateRoleInput) => {
      const existing = localRoles.find((r) => r.id === id);
      const updated: Role = {
        ...(existing || ({} as Role)),
        ...input,
        id,
        permissions: input.permissions || existing?.permissions || [],
        permissionCount: input.permissions ? input.permissions.length : existing?.permissionCount || 0,
        updatedAt: new Date().toISOString(),
      };

      try {
        const res = await apiClient.put(API_ENDPOINTS.ROLES.BY_ID(id), {
          name: input.name,
          description: input.description,
          status: input.status,
          permissions: input.permissions,
        });
        const saved = res.data?.data || res.data;
        if (saved) {
          if (saved.permissions) {
            updated.permissions = Array.isArray(saved.permissions)
              ? saved.permissions.map((p: any) => (typeof p === 'string' ? p : p.action || p.permission?.action)).filter(Boolean)
              : input.permissions || [];
            updated.permissionCount = updated.permissions.length;
          }
          if (saved.name) updated.name = saved.name;
          if (saved.description !== undefined) updated.description = saved.description;
        }
      } catch (err) {
        // Fallback to local
      }

      localRoles = localRoles.map((r) => (r.id === id ? updated : r));
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Role[]>(ROLES_QUERY_KEY, (old = []) =>
        old.map((r) => (r.id === updated.id ? updated : r))
      );
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      AuthService.loadPermissions();
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      try {
        await apiClient.delete(API_ENDPOINTS.ROLES.BY_ID(id));
      } catch (err) {
        // Fallback to local
      }

      localRoles = localRoles.filter((r) => r.id !== id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Role[]>(ROLES_QUERY_KEY, (old = []) =>
        old.filter((r) => r.id !== deletedId)
      );
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      AuthService.loadPermissions();
    },
  });
};
