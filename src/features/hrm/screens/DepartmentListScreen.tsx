import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AdvancedTable, AdvancedTableColumn } from '../../../shared/components/data-display/AdvancedTable';
import { AppDialog } from '../../../shared/components/feedback/AppDialog';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { Department } from '../../../types/models';
import {
  PieChart,
  PlusCircle,
  Edit,
  Trash2,
  Users,
  CheckCircle2,
  Briefcase,
  AlertCircle,
  Search,
  X,
} from 'lucide-react-native';
import {
  useDepartments,
  useAddDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from '../api/useDepartments';
import { useEmployees } from '../api/useEmployees';

export const DepartmentListScreen: React.FC = () => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();

  const { data: departments = [], isLoading, refetch } = useDepartments();
  const { data: employees = [] } = useEmployees();

  const addDeptMutation = useAddDepartment();
  const updateDeptMutation = useUpdateDepartment();
  const deleteDeptMutation = useDeleteDepartment();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [managerName, setManagerName] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formError, setFormError] = useState('');

  // Department employee counts
  const deptEmployeeCount = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const emp of employees) {
      if (emp.departmentId) {
        counts[emp.departmentId] = (counts[emp.departmentId] || 0) + 1;
      }
    }
    return counts;
  }, [employees]);

  // KPI stats
  const kpis = useMemo(() => {
    const total = departments.length;
    const active = departments.filter((d) => d.status === 'ACTIVE').length;
    const totalStaff = employees.length;
    return { total, active, totalStaff };
  }, [departments, employees]);

  const statusOptions = [
    { label: 'All Departments', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  // Filtered list
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      if (!d) return false;
      const name = (d.name || '').toLowerCase();
      const code = (d.code || '').toLowerCase();
      const manager = (d.managerName || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchSearch =
        name.includes(q) ||
        code.includes(q) ||
        manager.includes(q);

      const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [departments, searchQuery, statusFilter]);

  const handleOpenAdd = () => {
    setEditingDept(null);
    setName('');
    setCode(`DEP-${(departments.length + 1).toString().padStart(3, '0')}`);
    setDescription('');
    setManagerName('');
    setStatus('ACTIVE');
    setFormError('');
    setIsModalVisible(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setDescription(dept.description || '');
    setManagerName(dept.managerName || '');
    setStatus(dept.status);
    setFormError('');
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError('Department name is required');
      return;
    }
    if (!code.trim()) {
      setFormError('Department code is required');
      return;
    }

    try {
      if (editingDept) {
        await updateDeptMutation.mutateAsync({
          id: editingDept.id,
          data: { name: name.trim(), code: code.trim(), description: description.trim(), managerName: managerName.trim(), status },
        });
      } else {
        await addDeptMutation.mutateAsync({
          name: name.trim(),
          code: code.trim(),
          description: description.trim(),
          managerName: managerName.trim(),
          status,
        });
      }
      setIsModalVisible(false);
    } catch (err: any) {
      setFormError(err?.message || 'Error saving department');
    }
  };

  const handleDelete = (dept: Department) => {
    const count = deptEmployeeCount[dept.id] || 0;
    if (count > 0) {
      if (Platform.OS === 'web') {
        window.alert(`Cannot delete department "${dept.name}" because it has ${count} assigned employees.`);
      } else {
        Alert.alert('Cannot Delete', `Department has ${count} assigned employees.`);
      }
      return;
    }

    const doDelete = async () => {
      try {
        await deleteDeptMutation.mutateAsync(dept.id);
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to delete');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete department "${dept.name}"?`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Confirm Delete',
        `Are you sure you want to delete department "${dept.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const columns: AdvancedTableColumn<Department>[] = [
    {
      key: 'code',
      title: 'Code',
      width: 120,
      render: (val: string) => (
        <View style={styles.codeBadge}>
          <Text style={[styles.codeText, { color: theme.colors.primary }]}>{val}</Text>
        </View>
      ),
    },
    {
      key: 'name',
      title: 'Department Name',
      flex: 1,
      minWidth: 160,
      render: (val: string, item: Department) => (
        <View>
          <Text style={[styles.cellTextBold, { color: theme.colors.text }]}>{val}</Text>
          {item.description ? (
            <Text style={[styles.cellTextSmall, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
        </View>
      ),
    },
    {
      key: 'managerName',
      title: 'Head / Manager',
      width: 160,
      render: (val?: string) => (
        <Text style={[styles.cellText, { color: theme.colors.text }]}>
          {val || '—'}
        </Text>
      ),
    },
    {
      key: 'employees',
      title: 'Employees',
      width: 110,
      render: (_: any, item: Department) => {
        const count = deptEmployeeCount[item.id] || 0;
        return (
          <View style={styles.badgeRow}>
            <Users size={13} color="#64748B" />
            <Text style={[styles.badgeText, { color: theme.colors.text }]}> {count} Staff</Text>
          </View>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      width: 110,
      render: (val: string) => (
        <View style={[styles.statusBadge, val === 'ACTIVE' ? styles.statusActive : styles.statusInactive]}>
          <Text style={[styles.statusText, { color: val === 'ACTIVE' ? '#10B981' : '#EF4444' }]}>
            {val}
          </Text>
        </View>
      ),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header & KPI Section */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <PieChart size={24} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.title, { color: theme.colors.text }]}>Departments</Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Organize company structure, teams, and management units
          </Text>
        </View>

        <AppButton
          title="Add Department"
          icon={<PlusCircle size={18} color="#FFFFFF" />}
          onPress={handleOpenAdd}
          style={styles.addButton}
        />
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiCard, styles.kpiCardBlue]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#DBEAFE' }]}>
              <Briefcase size={18} color="#2563EB" />
            </View>
            <View style={styles.kpiTextCol}>
              <Text style={[styles.kpiLabel, { color: '#1E40AF' }]}>Total Departments</Text>
              <Text style={[styles.kpiValue, { color: '#1E3A8A' }]}>{kpis.total}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, styles.kpiCardGreen]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#DCFCE7' }]}>
              <CheckCircle2 size={18} color="#16A34A" />
            </View>
            <View style={styles.kpiTextCol}>
              <Text style={[styles.kpiLabel, { color: '#166534' }]}>Active Units</Text>
              <Text style={[styles.kpiValue, { color: '#14532D' }]}>{kpis.active}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, styles.kpiCardOrange]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FFEDD5' }]}>
              <Users size={18} color="#EA580C" />
            </View>
            <View style={styles.kpiTextCol}>
              <Text style={[styles.kpiLabel, { color: '#9A3412' }]}>Assigned Staff</Text>
              <Text style={[styles.kpiValue, { color: '#7C2D12' }]}>{kpis.totalStaff}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main Table */}
      <View style={styles.tableContainer}>
        <AdvancedTable
          data={filteredDepartments}
          columns={columns}
          isLoading={isLoading}
          searchPlaceholder="Search departments by name, code or head..."
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          filters={
            <View style={styles.tableFiltersRow}>
              <View style={styles.statusSelectWrapper}>
                <AppSelect
                  placeholder="Filter by Status"
                  value={statusFilter}
                  options={statusOptions}
                  onSelect={(val) => setStatusFilter((val as any) || 'ALL')}
                  containerStyle={styles.tableSelectContainer}
                />
              </View>
              {statusFilter !== 'ALL' && (
                <Pressable onPress={() => setStatusFilter('ALL')} style={styles.resetFilterBtn}>
                  <X size={14} color="#64748B" />
                  <Text style={styles.resetFilterText}>Reset</Text>
                </Pressable>
              )}
            </View>
          }
          renderRowActions={(item) => (
            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => handleOpenEdit(item)}
                style={[styles.actionBtn, { backgroundColor: '#EEF2FF' }]}
              >
                <Edit size={15} color="#4F46E5" />
              </Pressable>
              <Pressable
                onPress={() => handleDelete(item)}
                style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}
              >
                <Trash2 size={15} color="#EF4444" />
              </Pressable>
            </View>
          )}
          renderMobileCard={(item) => (
            <View style={[styles.mobileCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.mobileCardHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.name}</Text>
                  <Text style={[styles.cardCode, { color: theme.colors.primary }]}>{item.code}</Text>
                </View>
                <View style={[styles.statusBadge, item.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive]}>
                  <Text style={[styles.statusText, { color: item.status === 'ACTIVE' ? '#10B981' : '#EF4444' }]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              {item.description ? (
                <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]}>{item.description}</Text>
              ) : null}

              <View style={styles.mobileCardFooter}>
                <View style={styles.badgeRow}>
                  <Users size={14} color="#64748B" />
                  <Text style={[styles.badgeText, { color: theme.colors.text }]}>
                    {' '}{deptEmployeeCount[item.id] || 0} Staff
                  </Text>
                </View>
                <View style={styles.actionsRow}>
                  <Pressable onPress={() => handleOpenEdit(item)} style={[styles.actionBtn, { backgroundColor: '#EEF2FF' }]}>
                    <Edit size={15} color="#4F46E5" />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(item)} style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}>
                    <Trash2 size={15} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      </View>

      {/* Add / Edit Dialog */}
      <AppDialog
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title={editingDept ? 'Edit Department' : 'New Department'}
        maxWidth={500}
        compact={true}
        actions={
          <View style={styles.dialogActionsRow}>
            <AppButton
              title="Cancel"
              variant="outline"
              onPress={() => setIsModalVisible(false)}
              style={styles.dialogBtn}
            />
            <AppButton
              title={editingDept ? 'Update Department' : 'Create Department'}
              onPress={handleSave}
              isLoading={addDeptMutation.isPending || updateDeptMutation.isPending}
              style={styles.dialogBtn}
            />
          </View>
        }
      >
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {formError ? (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#DC2626" />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          <AppInput
            label="Department Name *"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Sales & Marketing"
          />

          <AppInput
            label="Department Code *"
            value={code}
            onChangeText={setCode}
            placeholder="e.g. DEP-SALES"
          />

          <AppInput
            label="Department Head / Manager"
            value={managerName}
            onChangeText={setManagerName}
            placeholder="e.g. Sarah Connor"
          />

          <AppInput
            label="Description / Purpose"
            value={description}
            onChangeText={setDescription}
            placeholder="Brief overview of department duties"
            multiline
            numberOfLines={3}
          />

          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Status</Text>
            <View style={styles.statusToggleRow}>
              <Pressable
                style={[
                  styles.toggleBtn,
                  status === 'ACTIVE' && { backgroundColor: '#10B981', borderColor: '#10B981' },
                ]}
                onPress={() => setStatus('ACTIVE')}
              >
                <Text style={[styles.toggleBtnText, { color: status === 'ACTIVE' ? '#FFFFFF' : theme.colors.text }]}>
                  Active
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.toggleBtn,
                  status === 'INACTIVE' && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
                ]}
                onPress={() => setStatus('INACTIVE')}
              >
                <Text style={[styles.toggleBtnText, { color: status === 'INACTIVE' ? '#FFFFFF' : theme.colors.text }]}>
                  Inactive
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </AppDialog>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    minWidth: 140,
  },
  kpiContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 150,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  kpiCardBlue: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  kpiCardGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  kpiCardOrange: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  kpiIconBox: {
    width: 34,
    height: 34,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiTextCol: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 1,
  },
  tableFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  statusSelectWrapper: {
    minWidth: 160,
  },
  tableSelectContainer: {
    marginBottom: 0,
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  resetFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  dialogActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  dialogBtn: {
    minWidth: 110,
  },
  tableContainer: {
    flex: 1,
  },
  codeBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cellText: {
    fontSize: 13,
  },
  cellTextBold: {
    fontSize: 14,
    fontWeight: '600',
  },
  cellTextSmall: {
    fontSize: 12,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: '#ECFDF5',
  },
  statusInactive: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mobileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardCode: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  cardDesc: {
    fontSize: 13,
    marginTop: 6,
  },
  mobileCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalContent: {
    maxHeight: 480,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
  },
  formGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  statusToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
  },
});
