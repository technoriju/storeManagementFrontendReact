import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/api-client';
import { API_ENDPOINTS } from '../../../core/api/api-urls';
import { User } from '../../../types/models';

export const USERS_QUERY_KEY = ['users'];

export const DEFAULT_USERS: User[] = [
  {
    id: 1,
    username: 'admin',
    fullName: 'System Administrator',
    email: 'admin@pos-system.com',
    phone: '+1 555-0199',
    role: 'Super Admin',
    roleId: 1,
    branchId: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    username: 'johndoe',
    fullName: 'John Doe',
    email: 'johndoe@pos-system.com',
    phone: '+1 555-0142',
    role: 'Store Manager',
    roleId: 3,
    branchId: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    username: 'sarahc',
    fullName: 'Sarah Connor',
    email: 'sarah.c@pos-system.com',
    phone: '+1 555-0188',
    role: 'Cashier / POS Operator',
    roleId: 4,
    branchId: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    username: 'mikeb',
    fullName: 'Mike Brown',
    email: 'mike.b@pos-system.com',
    phone: '+1 555-0167',
    role: 'Cashier / POS Operator',
    roleId: 4,
    branchId: 2,
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let localUsers: User[] = [...DEFAULT_USERS];

export const useUsers = () => {
  return useQuery<User[]>({
    queryKey: USERS_QUERY_KEY,
    queryFn: async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.USERS.BASE);
        const data = res.data?.data || res.data;
        if (Array.isArray(data) && data.length > 0) {
          localUsers = data.map((u: any) => ({
            id: u.id,
            username: u.username,
            fullName: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
            email: u.email || '',
            phone: u.phone || '',
            role: typeof u.role === 'string' ? u.role : u.role?.name || 'User',
            roleId: u.roleId || u.role?.id,
            branchId: u.branchId,
            isActive: u.isActive !== false,
            createdAt: u.createdAt || new Date().toISOString(),
            updatedAt: u.updatedAt || new Date().toISOString(),
          }));
          return localUsers;
        }
      } catch (err) {
        // Fallback to local memory / default users
      }
      return localUsers;
    },
  });
};

export interface CreateUserInput {
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  password?: string;
  roleId: number;
  roleName?: string;
  branchId?: number;
  isActive?: boolean;
}

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const newUser: User = {
        id: Date.now(),
        username: input.username,
        fullName: input.fullName,
        email: input.email || '',
        phone: input.phone || '',
        role: input.roleName || 'User',
        roleId: input.roleId,
        branchId: input.branchId ?? 1,
        isActive: input.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        const res = await apiClient.post(API_ENDPOINTS.USERS.BASE, input);
        const saved = res.data?.data || res.data;
        if (saved?.id) {
          newUser.id = saved.id;
        }
      } catch (err) {
        // Fallback to local
      }

      localUsers = [newUser, ...localUsers];
      return newUser;
    },
    onSuccess: (newUser) => {
      queryClient.setQueryData<User[]>(USERS_QUERY_KEY, (old = []) => [newUser, ...old]);
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
};

export interface UpdateUserInput {
  id: number;
  username?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  roleId?: number;
  roleName?: string;
  branchId?: number;
  isActive?: boolean;
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateUserInput) => {
      const existing = localUsers.find((u) => u.id === id);
      const updated: User = {
        ...(existing || ({} as User)),
        ...input,
        id,
        role: input.roleName ?? existing?.role ?? 'User',
        updatedAt: new Date().toISOString(),
      };

      try {
        await apiClient.put(API_ENDPOINTS.USERS.BY_ID(id), input);
      } catch (err) {
        // Fallback to local
      }

      localUsers = localUsers.map((u) => (u.id === id ? updated : u));
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<User[]>(USERS_QUERY_KEY, (old = []) =>
        old.map((u) => (u.id === updated.id ? updated : u))
      );
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      try {
        await apiClient.delete(API_ENDPOINTS.USERS.BY_ID(id));
      } catch (err) {
        // Fallback to local
      }

      localUsers = localUsers.filter((u) => u.id !== id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<User[]>(USERS_QUERY_KEY, (old = []) =>
        old.filter((u) => u.id !== deletedId)
      );
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
};

export const useToggleUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const existing = localUsers.find((u) => u.id === id);
      const updated: User = {
        ...(existing || ({} as User)),
        id,
        isActive,
        updatedAt: new Date().toISOString(),
      };

      try {
        await apiClient.patch(API_ENDPOINTS.USERS.STATUS(id), { isActive });
      } catch (err) {
        // Fallback to local
      }

      localUsers = localUsers.map((u) => (u.id === id ? updated : u));
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<User[]>(USERS_QUERY_KEY, (old = []) =>
        old.map((u) => (u.id === updated.id ? updated : u))
      );
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
};
