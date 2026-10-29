import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Platform,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AdvancedTable, AdvancedTableColumn } from '../../../shared/components/data-display/AdvancedTable';
import { AppDialog } from '../../../shared/components/feedback/AppDialog';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { User } from '../../../types/models';
import {
  Users,
  PlusCircle,
  Edit,
  Trash2,
  CheckCircle2,
  UserX,
  Shield,
  Search,
  Building,
  Mail,
  Phone,
  Lock,
  Power,
} from 'lucide-react-native';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useToggleUserStatus,
} from '../api/useUsers';
import { useRoles } from '../api/useRoles';
import { usePermissions } from '../../../core/auth/usePermissions';

export const UsersListScreen: React.FC = () => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();
  const { can } = usePermissions();

  const { data: users = [], isLoading, refetch } = useUsers();
  const { data: roles = [] } = useRoles();

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const toggleStatusMutation = useToggleUserStatus();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [roleFilter, setRoleFilter] = useState<string | 'ALL'>('ALL');

  // Modals
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>(undefined);
  const [selectedBranchId, setSelectedBranchId] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  // Branch mock options
  const branchOptions = [
    { label: 'Main Branch / Head Office', value: 1 },
    { label: 'Downtown Store', value: 2 },
    { label: 'Warehouse Logistics Center', value: 3 },
  ];

  // KPIs
  const kpis = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive !== false).length;
    const inactive = users.filter((u) => u.isActive === false).length;
    const totalRoles = roles.length;
    return { total, active, inactive, totalRoles };
  }, [users, roles]);

  const roleFilterOptions = useMemo(() => [
    { label: 'All Roles', value: 'ALL' },
    ...roles.map((r) => ({ label: r.name, value: r.name })),
  ], [roles]);

  const roleFormOptions = useMemo(() => [
    ...roles.map((r) => ({ label: r.name, value: r.id })),
  ], [roles]);

  const statusOptions = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (!u) return false;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        (u.username || '').toLowerCase().includes(q) ||
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q);

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.isActive !== false) ||
        (statusFilter === 'INACTIVE' && u.isActive === false);

      const matchRole =
        roleFilter === 'ALL' ||
        u.role === roleFilter ||
        (roles.find((r) => r.id === u.roleId)?.name === roleFilter);

      return matchSearch && matchStatus && matchRole;
    });
  }, [users, searchQuery, statusFilter, roleFilter, roles]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUsername('');
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setSelectedRoleId(roles.length > 0 ? roles[0].id : undefined);
    setSelectedBranchId(1);
    setIsActive(true);
    setFormError('');
    setIsModalVisible(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setUsername(user.username || '');
    setFullName(user.fullName || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setPassword('');
    const matchedRole = roles.find((r) => r.name === user.role || r.id === user.roleId);
    setSelectedRoleId(matchedRole?.id || roles[0]?.id);
    setSelectedBranchId(user.branchId || 1);
    setIsActive(user.isActive !== false);
    setFormError('');
    setIsModalVisible(true);
  };

  const handleSaveUser = async () => {
    if (!username.trim()) {
      setFormError('Username is required.');
      return;
    }
    if (!fullName.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (!editingUser && !password.trim()) {
      setFormError('Password is required for new users.');
      return;
    }
    if (!selectedRoleId) {
      setFormError('Please select a role.');
      return;
    }

    setFormError('');
    const roleObj = roles.find((r) => r.id === selectedRoleId);
    const roleName = roleObj?.name || 'User';

    try {
      if (editingUser) {
        await updateUserMutation.mutateAsync({
          id: editingUser.id,
          username: username.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password: password.trim() ? password.trim() : undefined,
          roleId: selectedRoleId,
          roleName,
          branchId: selectedBranchId,
          isActive,
        });
      } else {
        await createUserMutation.mutateAsync({
          username: username.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password: password.trim(),
          roleId: selectedRoleId,
          roleName,
          branchId: selectedBranchId,
          isActive,
        });
      }
      setIsModalVisible(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to save user.');
    }
  };

  const handleDeleteUser = (user: User) => {
    const confirmDelete = () => {
      deleteUserMutation.mutate(user.id);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Delete User',
        `Are you sure you want to delete user "${user.username}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  const handleToggleStatus = (user: User) => {
    const nextStatus = !user.isActive;
    toggleStatusMutation.mutate({ id: user.id, isActive: nextStatus });
  };

  // Table Columns
  const columns: AdvancedTableColumn<User>[] = [
    {
      key: 'user',
      title: 'User',
      flex: 2,
      minWidth: 180,
      render: (_, u) => (
        <View style={styles.userCell}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
              {(u.fullName || u.username || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {u.fullName || u.username}
            </Text>
            <Text style={[styles.userHandle, { color: theme.colors.textSecondary }]}>
              @{u.username}
            </Text>
          </View>
        </View>
      ),
    },
    {
      key: 'contact',
      title: 'Contact',
      flex: 2,
      minWidth: 160,
      render: (_, u) => (
        <View>
          {u.email ? (
            <View style={styles.contactRow}>
              <Mail size={12} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.contactText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {u.email}
              </Text>
            </View>
          ) : null}
          {u.phone ? (
            <View style={styles.contactRow}>
              <Phone size={12} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.contactText, { color: theme.colors.textSecondary }]}>
                {u.phone}
              </Text>
            </View>
          ) : null}
          {!u.email && !u.phone && (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>—</Text>
          )}
        </View>
      ),
    },
    {
      key: 'role',
      title: 'Role',
      flex: 1.5,
      minWidth: 140,
      render: (_, u) => (
        <View style={[styles.roleBadge, { backgroundColor: theme.colors.primary + '15' }]}>
          <Shield size={12} color={theme.colors.primary} style={{ marginRight: 4 }} />
          <Text style={[styles.roleBadgeText, { color: theme.colors.primary }]}>
            {u.role || 'User'}
          </Text>
        </View>
      ),
    },
    {
      key: 'branch',
      title: 'Branch',
      flex: 1.5,
      minWidth: 130,
      render: (_, u) => {
        const branchName = branchOptions.find((b) => b.value === u.branchId)?.label || 'Main Branch';
        return (
          <View style={styles.branchRow}>
            <Building size={12} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.branchText, { color: theme.colors.text }]} numberOfLines={1}>
              {branchName.split('/')[0].trim()}
            </Text>
          </View>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      flex: 1.2,
      minWidth: 110,
      render: (_, u) => {
        const active = u.isActive !== false;
        return (
          <Pressable
            style={[
              styles.statusPill,
              {
                backgroundColor: active ? '#E8F5E9' : '#FFEBEE',
                borderColor: active ? '#81C784' : '#E57373',
              },
            ]}
            onPress={() => handleToggleStatus(u)}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: active ? '#2E7D32' : '#C62828' },
              ]}
            />
            <Text
              style={[
                styles.statusPillText,
                { color: active ? '#2E7D32' : '#C62828' },
              ]}
            >
              {active ? 'Active' : 'Inactive'}
            </Text>
          </Pressable>
        );
      },
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* KPI Cards Header */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#E3F2FD' }]}>
            <Users size={20} color="#1976D2" />
          </View>
          <View>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{kpis.total}</Text>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Users</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#E8F5E9' }]}>
            <CheckCircle2 size={20} color="#388E3C" />
          </View>
          <View>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{kpis.active}</Text>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Active</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#FFEBEE' }]}>
            <UserX size={20} color="#D32F2F" />
          </View>
          <View>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{kpis.inactive}</Text>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Inactive</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#FFF3E0' }]}>
            <Shield size={20} color="#F57C00" />
          </View>
          <View>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{kpis.totalRoles}</Text>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>System Roles</Text>
          </View>
        </View>
      </View>

      {/* Main Table Card */}
      <View style={[styles.tableCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <AdvancedTable
          title="User Directory"
          subtitle="Manage system operators, assign access privileges and branches"
          columns={columns}
          data={filteredUsers}
          isLoading={isLoading}
          searchPlaceholder="Search users by name, username, email..."
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          headerActions={
            can('users:create') ? (
              <AppButton
                title="Add User"
                icon={<PlusCircle size={16} color="#FFF" />}
                onPress={handleOpenAdd}
                size="small"
              />
            ) : undefined
          }
          filters={
            <View style={[styles.filtersRow, isMobile && styles.filtersCol]}>
              <View style={[styles.selectBox, isMobile && { width: '100%', marginBottom: 8 }]}>
                <AppSelect
                  placeholder="Filter by Role"
                  options={roleFilterOptions}
                  value={roleFilter}
                  onSelect={setRoleFilter}
                />
              </View>
              <View style={[styles.selectBox, isMobile && { width: '100%' }]}>
                <AppSelect
                  placeholder="Filter by Status"
                  options={statusOptions}
                  value={statusFilter}
                  onSelect={setStatusFilter}
                />
              </View>
            </View>
          }
          renderRowActions={(u) => (
            <View style={styles.actionButtons}>
              <Pressable
                onPress={() => handleToggleStatus(u)}
                style={[styles.iconBtn, { backgroundColor: theme.colors.background }]}
                accessibilityLabel="Toggle Active Status"
              >
                <Power size={15} color={u.isActive !== false ? '#2E7D32' : '#C62828'} />
              </Pressable>
              {can('users:edit') && (
                <Pressable
                  onPress={() => handleOpenEdit(u)}
                  style={[styles.iconBtn, { backgroundColor: theme.colors.background }]}
                  accessibilityLabel="Edit User"
                >
                  <Edit size={15} color={theme.colors.primary} />
                </Pressable>
              )}
              {can('users:delete') && (
                <Pressable
                  onPress={() => handleDeleteUser(u)}
                  style={[styles.iconBtn, { backgroundColor: '#FFEBEE' }]}
                  accessibilityLabel="Delete User"
                >
                  <Trash2 size={15} color="#D32F2F" />
                </Pressable>
              )}
            </View>
          )}
        />
      </View>

      {/* Add / Edit User Modal */}
      <AppDialog
        visible={isModalVisible}
        title={editingUser ? 'Edit User' : 'Add New User'}
        onClose={() => setIsModalVisible(false)}
        maxWidth={520}
        actions={
          <View style={styles.modalActions}>
            <AppButton
              title="Cancel"
              variant="outline"
              onPress={() => setIsModalVisible(false)}
              style={{ marginRight: 8 }}
            />
            <AppButton
              title={editingUser ? 'Save Changes' : 'Create User'}
              onPress={handleSaveUser}
              isLoading={createUserMutation.isPending || updateUserMutation.isPending}
            />
          </View>
        }
      >
        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
          {formError ? (
            <View style={styles.errorAlert}>
              <Text style={styles.errorAlertText}>{formError}</Text>
            </View>
          ) : null}

          <View style={styles.formRow}>
            <View style={{ flex: 1, marginRight: isMobile ? 0 : 8 }}>
              <AppInput
                label="Username *"
                placeholder="e.g. jdoe"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
            <View style={{ flex: 1, marginLeft: isMobile ? 0 : 8 }}>
              <AppInput
                label="Full Name *"
                placeholder="e.g. John Doe"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={{ flex: 1, marginRight: isMobile ? 0 : 8 }}>
              <AppInput
                label="Email"
                placeholder="user@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={{ flex: 1, marginLeft: isMobile ? 0 : 8 }}>
              <AppInput
                label="Phone"
                placeholder="+1 555-0100"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <AppInput
            label={editingUser ? 'Password (leave blank to keep unchanged)' : 'Password *'}
            placeholder="Min 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View style={{ marginBottom: theme.spacing.md }}>
            <AppSelect
              label="Assigned Role *"
              options={roleFormOptions}
              value={selectedRoleId}
              onSelect={setSelectedRoleId}
              placeholder="Select system role"
            />
          </View>

          <View style={{ marginBottom: theme.spacing.md }}>
            <AppSelect
              label="Assigned Branch"
              options={branchOptions}
              value={selectedBranchId}
              onSelect={setSelectedBranchId}
              placeholder="Select store / branch"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: theme.colors.text }]}>
              Account Active
            </Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#CFD8DC', true: theme.colors.primary + '80' }}
              thumbColor={isActive ? theme.colors.primary : '#ECEFF1'}
            />
          </View>
        </ScrollView>
      </AppDialog>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  kpiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  kpiIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  kpiLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  tableCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  filtersCol: {
    flexDirection: 'column',
    width: '100%',
  },
  selectBox: {
    width: 170,
  },
  userCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
  },
  userHandle: {
    fontSize: 11,
    marginTop: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 1,
  },
  contactText: {
    fontSize: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  branchText: {
    fontSize: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    maxHeight: 480,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 4,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorAlert: {
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorAlertText: {
    color: '#C62828',
    fontSize: 12,
  },
});
