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
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AdvancedTable, AdvancedTableColumn } from '../../../shared/components/data-display/AdvancedTable';
import { AppDialog } from '../../../shared/components/feedback/AppDialog';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { Role, Permission } from '../../../types/models';
import {
  Shield,
  PlusCircle,
  Edit,
  Trash2,
  Key,
  Users,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  CheckSquare,
  Square,
  Lock,
} from 'lucide-react-native';
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
} from '../api/useRoles';
import { usePermissionModules, usePermissionsList } from '../api/usePermissions';
import { usePermissions } from '../../../core/auth/usePermissions';

export const RolesListScreen: React.FC = () => {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const { can } = usePermissions();

  const { data: roles = [], isLoading } = useRoles();
  const { data: allPermissions = [] } = usePermissionsList();
  const { data: moduleGroups = [] } = usePermissionModules();

  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permSearch, setPermSearch] = useState('');
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState('');

  // KPIs
  const kpis = useMemo(() => {
    const totalRoles = roles.length;
    const totalPermissions = allPermissions.length;
    return { totalRoles, totalPermissions };
  }, [roles, allPermissions]);

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      if (!r) return false;
      const q = searchQuery.toLowerCase();
      return (
        (r.name || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
    });
  }, [roles, searchQuery]);

  const toggleModuleCollapse = (moduleName: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [moduleName]: !prev[moduleName],
    }));
  };

  const handleOpenAdd = () => {
    setEditingRole(null);
    setName('');
    setDescription('');
    setSelectedPermissions([]);
    setPermSearch('');
    setFormError('');
    setIsModalVisible(true);
  };

  const handleOpenEdit = (role: Role) => {
    setEditingRole(role);
    setName(role.name || '');
    setDescription(role.description || '');

    // Extract permission action strings
    const perms: string[] = [];
    if (Array.isArray(role.permissions)) {
      for (const p of role.permissions) {
        if (typeof p === 'string') perms.push(p);
        else if (typeof p === 'object' && p !== null) {
          if ('action' in p && (p as any).action) perms.push((p as any).action);
          else if ('permission' in p && (p as any).permission?.action) {
            perms.push((p as any).permission.action);
          }
        }
      }
    }
    setSelectedPermissions(perms);
    setPermSearch('');
    setFormError('');
    setIsModalVisible(true);
  };

  const handleTogglePermission = (action: string) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(action)) {
        return prev.filter((p) => p !== action);
      } else {
        return [...prev, action];
      }
    });
  };

  const handleToggleModuleAll = (modulePerms: Permission[]) => {
    const moduleActions = modulePerms.map((p) => p.action);
    const allSelected = moduleActions.every((act) => selectedPermissions.includes(act));

    if (allSelected) {
      // Deselect all in module
      setSelectedPermissions((prev) => prev.filter((p) => !moduleActions.includes(p)));
    } else {
      // Select all in module
      setSelectedPermissions((prev) => {
        const set = new Set([...prev, ...moduleActions]);
        return Array.from(set);
      });
    }
  };

  const handleSelectAllGlobal = () => {
    const allActions = allPermissions.map((p) => p.action);
    if (selectedPermissions.length === allActions.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(allActions);
    }
  };

  const handleSaveRole = async () => {
    if (!name.trim()) {
      setFormError('Role name is required.');
      return;
    }

    setFormError('');

    try {
      if (editingRole) {
        await updateRoleMutation.mutateAsync({
          id: editingRole.id,
          name: name.trim(),
          description: description.trim(),
          permissions: selectedPermissions,
        });
      } else {
        await createRoleMutation.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          permissions: selectedPermissions,
        });
      }
      setIsModalVisible(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to save role.');
    }
  };

  const handleDeleteRole = (role: Role) => {
    if (role.name === 'Super Admin' || role.name === 'Admin') {
      Alert.alert('Protected Role', 'System default roles cannot be deleted.');
      return;
    }

    const confirmDelete = () => {
      deleteRoleMutation.mutate(role.id);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete role "${role.name}"?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Delete Role',
        `Are you sure you want to delete role "${role.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  // Table Columns
  const columns: AdvancedTableColumn<Role>[] = [
    {
      key: 'role',
      title: 'Role Name',
      flex: 2,
      minWidth: 160,
      render: (_, r) => (
        <View style={styles.roleCell}>
          <View style={[styles.roleIcon, { backgroundColor: theme.colors.primary + '20' }]}>
            <Shield size={16} color={theme.colors.primary} />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={[styles.roleNameText, { color: theme.colors.text }]}>{r.name}</Text>
            {r.name === 'Super Admin' && (
              <Text style={{ fontSize: 10, color: theme.colors.primary, fontWeight: '600' }}>
                SYSTEM DEFAULT
              </Text>
            )}
          </View>
        </View>
      ),
    },
    {
      key: 'description',
      title: 'Description',
      flex: 2.5,
      minWidth: 200,
      render: (_, r) => (
        <Text style={[styles.descText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {r.description || 'No description provided.'}
        </Text>
      ),
    },
    {
      key: 'permissions',
      title: 'Permissions',
      flex: 1.5,
      minWidth: 130,
      render: (_, r) => {
        const isWildcard = Array.isArray(r.permissions) && r.permissions.includes('*');
        const count = isWildcard ? 'All (Wildcard *)' : `${r.permissionCount || (Array.isArray(r.permissions) ? r.permissions.length : 0)} perms`;
        return (
          <View style={[styles.countBadge, { backgroundColor: '#EDE7F6' }]}>
            <Key size={12} color="#5E35B1" style={{ marginRight: 4 }} />
            <Text style={[styles.countBadgeText, { color: '#5E35B1' }]}>{count}</Text>
          </View>
        );
      },
    },
    {
      key: 'users',
      title: 'Assigned Users',
      flex: 1.2,
      minWidth: 120,
      render: (_, r) => (
        <View style={[styles.countBadge, { backgroundColor: '#E0F2F1' }]}>
          <Users size={12} color="#00796B" style={{ marginRight: 4 }} />
          <Text style={[styles.countBadgeText, { color: '#00796B' }]}>
            {r.userCount || 0} Users
          </Text>
        </View>
      ),
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* KPI Cards Header */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#EDE7F6' }]}>
            <Shield size={20} color="#5E35B1" />
          </View>
          <View>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{kpis.totalRoles}</Text>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Configured Roles</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#E3F2FD' }]}>
            <Key size={20} color="#1976D2" />
          </View>
          <View>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{kpis.totalPermissions}</Text>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>System Permissions</Text>
          </View>
        </View>
      </View>

      {/* Main Table Card */}
      <View style={[styles.tableCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <AdvancedTable
          title="Role & Privilege Management"
          subtitle="Define organizational roles and configure granular module permissions"
          columns={columns}
          data={filteredRoles}
          isLoading={isLoading}
          searchPlaceholder="Search roles by name or description..."
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          headerActions={
            can('roles:create') ? (
              <AppButton
                title="Create Role"
                icon={<PlusCircle size={16} color="#FFF" />}
                onPress={handleOpenAdd}
                size="small"
              />
            ) : undefined
          }
          renderRowActions={(r) => (
            <View style={styles.actionButtons}>
              {can('roles:edit') && (
                <Pressable
                  onPress={() => handleOpenEdit(r)}
                  style={[styles.iconBtn, { backgroundColor: theme.colors.background }]}
                  accessibilityLabel="Edit Role"
                >
                  <Edit size={15} color={theme.colors.primary} />
                </Pressable>
              )}
              {can('roles:delete') && r.name !== 'Super Admin' && (
                <Pressable
                  onPress={() => handleDeleteRole(r)}
                  style={[styles.iconBtn, { backgroundColor: '#FFEBEE' }]}
                  accessibilityLabel="Delete Role"
                >
                  <Trash2 size={15} color="#D32F2F" />
                </Pressable>
              )}
            </View>
          )}
        />
      </View>

      {/* Add / Edit Role Modal */}
      <AppDialog
        visible={isModalVisible}
        title={editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Role'}
        onClose={() => setIsModalVisible(false)}
        maxWidth={640}
        actions={
          <View style={styles.modalActions}>
            <AppButton
              title="Cancel"
              variant="outline"
              onPress={() => setIsModalVisible(false)}
              style={{ marginRight: 8 }}
            />
            <AppButton
              title={editingRole ? 'Update Role' : 'Save Role'}
              onPress={handleSaveRole}
              isLoading={createRoleMutation.isPending || updateRoleMutation.isPending}
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

          <AppInput
            label="Role Name *"
            placeholder="e.g. Inventory Supervisor"
            value={name}
            onChangeText={setName}
            editable={editingRole?.name !== 'Super Admin'}
          />

          <AppInput
            label="Description"
            placeholder="Describe duties and system access scope..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
          />

          {/* Permissions Header & Actions */}
          <View style={styles.permHeaderRow}>
            <View>
              <Text style={[styles.permHeading, { color: theme.colors.text }]}>
                Assign Permissions
              </Text>
              <Text style={[styles.permSubheading, { color: theme.colors.textSecondary }]}>
                {selectedPermissions.length} selected of {allPermissions.length} total
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSelectAllGlobal}
              style={[styles.selectAllBtn, { borderColor: theme.colors.border }]}
            >
              <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: '600' }}>
                {selectedPermissions.length === allPermissions.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Permissions Grouped by Module */}
          <View style={styles.moduleGroupsList}>
            {moduleGroups.map((group) => {
              const isCollapsed = collapsedModules[group.module];
              const moduleActions = group.permissions.map((p) => p.action);
              const selectedCount = moduleActions.filter((act) =>
                selectedPermissions.includes(act)
              ).length;
              const allSelected = selectedCount === moduleActions.length && moduleActions.length > 0;

              return (
                <View
                  key={group.module}
                  style={[
                    styles.moduleCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: allSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.moduleHeader}>
                    <TouchableOpacity
                      onPress={() => toggleModuleCollapse(group.module)}
                      style={styles.moduleTitleRow}
                    >
                      {isCollapsed ? (
                        <ChevronDown size={18} color={theme.colors.textSecondary} />
                      ) : (
                        <ChevronUp size={18} color={theme.colors.textSecondary} />
                      )}
                      <Text style={[styles.moduleTitle, { color: theme.colors.text }]}>
                        {group.title}
                      </Text>
                      <View style={[styles.moduleBadge, { backgroundColor: theme.colors.background }]}>
                        <Text style={[styles.moduleBadgeText, { color: theme.colors.textSecondary }]}>
                          {selectedCount}/{moduleActions.length}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleToggleModuleAll(group.permissions)}
                      style={styles.moduleSelectAllToggle}
                    >
                      <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: '500' }}>
                        {allSelected ? 'Clear' : 'Select All'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {!isCollapsed && (
                    <View style={styles.permissionsGrid}>
                      {group.permissions.map((p) => {
                        const checked = selectedPermissions.includes(p.action);
                        return (
                          <TouchableOpacity
                            key={p.action}
                            onPress={() => handleTogglePermission(p.action)}
                            style={[
                              styles.permItem,
                              {
                                backgroundColor: checked
                                  ? theme.colors.primary + '10'
                                  : theme.colors.background,
                                borderColor: checked
                                  ? theme.colors.primary
                                  : theme.colors.border,
                              },
                            ]}
                          >
                            <View style={styles.permCheckbox}>
                              {checked ? (
                                <CheckSquare size={16} color={theme.colors.primary} />
                              ) : (
                                <Square size={16} color={theme.colors.textSecondary} />
                              )}
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                              <Text
                                style={[
                                  styles.permActionText,
                                  { color: theme.colors.text, fontWeight: checked ? '600' : '400' },
                                ]}
                              >
                                {p.action}
                              </Text>
                              {p.description ? (
                                <Text
                                  style={[styles.permDescText, { color: theme.colors.textSecondary }]}
                                  numberOfLines={2}
                                >
                                  {p.description}
                                </Text>
                              ) : null}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
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
    minWidth: 160,
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
  roleCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleNameText: {
    fontSize: 13,
    fontWeight: '600',
  },
  descText: {
    fontSize: 12,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  countBadgeText: {
    fontSize: 12,
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
    maxHeight: 520,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
  },
  permHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  permHeading: {
    fontSize: 14,
    fontWeight: '700',
  },
  permSubheading: {
    fontSize: 12,
    marginTop: 1,
  },
  selectAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  moduleGroupsList: {
    gap: 10,
  },
  moduleCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moduleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  moduleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  moduleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  moduleSelectAllToggle: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  permissionsGrid: {
    marginTop: 8,
    gap: 6,
  },
  permItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  permCheckbox: {
    marginTop: 2,
  },
  permActionText: {
    fontSize: 12,
  },
  permDescText: {
    fontSize: 11,
    marginTop: 2,
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
