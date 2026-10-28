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
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { Shift } from '../../../types/models';
import {
  Shuffle,
  PlusCircle,
  Edit,
  Trash2,
  Clock,
  CheckCircle2,
  Coffee,
  AlertCircle,
  Users,
} from 'lucide-react-native';
import {
  useShifts,
  useAddShift,
  useUpdateShift,
  useDeleteShift,
} from '../api/useShifts';
import { useEmployees } from '../api/useEmployees';

export const ShiftListScreen: React.FC = () => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const { data: shifts = [], isLoading } = useShifts();
  const { data: employees = [] } = useEmployees();

  const addShiftMutation = useAddShift();
  const updateShiftMutation = useUpdateShift();
  const deleteShiftMutation = useDeleteShift();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [lateToleranceMinutes, setLateToleranceMinutes] = useState('15');
  const [breakDurationMinutes, setBreakDurationMinutes] = useState('60');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formError, setFormError] = useState('');

  // Count employees in this shift
  const shiftEmployeeCount = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const emp of employees) {
      if (emp.shiftId) {
        counts[emp.shiftId] = (counts[emp.shiftId] || 0) + 1;
      }
    }
    return counts;
  }, [employees]);

  // KPI stats
  const kpis = useMemo(() => {
    const total = shifts.length;
    const active = shifts.filter((s) => s.status === 'ACTIVE').length;
    const morningCount = shifts.filter((s) => s.startTime && parseInt(s.startTime) < 12).length;
    return { total, active, morningCount };
  }, [shifts]);

  // Duration calculator
  const calculateDuration = (start?: string, end?: string) => {
    try {
      if (!start || !end) return '—';
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      let diffMins = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMins < 0) diffMins += 24 * 60; // Overnight shift
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
    } catch {
      return '—';
    }
  };

  // Filtered list
  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (!s) return false;
      const name = (s.name || '').toLowerCase();
      const code = (s.code || '').toLowerCase();
      const st = s.startTime || '';
      const et = s.endTime || '';
      const q = searchQuery.toLowerCase();

      const matchSearch =
        name.includes(q) ||
        code.includes(q) ||
        st.includes(q) ||
        et.includes(q);

      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [shifts, searchQuery, statusFilter]);

  const handleOpenAdd = () => {
    setEditingShift(null);
    setName('');
    setCode(`SHF-${(shifts.length + 1).toString().padStart(3, '0')}`);
    setStartTime('09:00');
    setEndTime('18:00');
    setLateToleranceMinutes('15');
    setBreakDurationMinutes('60');
    setStatus('ACTIVE');
    setFormError('');
    setIsModalVisible(true);
  };

  const handleOpenEdit = (shift: Shift) => {
    setEditingShift(shift);
    setName(shift.name);
    setCode(shift.code);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setLateToleranceMinutes(String(shift.lateToleranceMinutes ?? 15));
    setBreakDurationMinutes(String(shift.breakDurationMinutes ?? 60));
    setStatus(shift.status);
    setFormError('');
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError('Shift name is required');
      return;
    }
    if (!code.trim()) {
      setFormError('Shift code is required');
      return;
    }
    if (!startTime.trim() || !endTime.trim()) {
      setFormError('Start time and end time are required');
      return;
    }

    try {
      if (editingShift) {
        await updateShiftMutation.mutateAsync({
          id: editingShift.id,
          data: {
            name: name.trim(),
            code: code.trim(),
            startTime: startTime.trim(),
            endTime: endTime.trim(),
            lateToleranceMinutes: parseInt(lateToleranceMinutes) || 15,
            breakDurationMinutes: parseInt(breakDurationMinutes) || 60,
            status,
          },
        });
      } else {
        await addShiftMutation.mutateAsync({
          name: name.trim(),
          code: code.trim(),
          startTime: startTime.trim(),
          endTime: endTime.trim(),
          lateToleranceMinutes: parseInt(lateToleranceMinutes) || 15,
          breakDurationMinutes: parseInt(breakDurationMinutes) || 60,
          status,
        });
      }
      setIsModalVisible(false);
    } catch (err: any) {
      setFormError(err?.message || 'Error saving shift');
    }
  };

  const handleDelete = (shift: Shift) => {
    const count = shiftEmployeeCount[shift.id] || 0;
    if (count > 0) {
      if (Platform.OS === 'web') {
        window.alert(`Cannot delete shift "${shift.name}" because ${count} employees are assigned to it.`);
      } else {
        Alert.alert('Cannot Delete', `Shift is assigned to ${count} employees.`);
      }
      return;
    }

    const doDelete = async () => {
      try {
        await deleteShiftMutation.mutateAsync(shift.id);
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to delete');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete shift "${shift.name}"?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Confirm Delete', `Delete shift "${shift.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const columns: AdvancedTableColumn<Shift>[] = [
    {
      key: 'code',
      title: 'Code',
      width: 110,
      render: (val: string) => (
        <View style={styles.codeBadge}>
          <Text style={[styles.codeText, { color: theme.colors.primary }]}>{val}</Text>
        </View>
      ),
    },
    {
      key: 'name',
      title: 'Shift Name',
      flex: 1,
      minWidth: 150,
      render: (val: string) => (
        <Text style={[styles.cellTextBold, { color: theme.colors.text }]}>{val}</Text>
      ),
    },
    {
      key: 'timing',
      title: 'Working Hours',
      width: 160,
      render: (_: any, item: Shift) => (
        <View style={styles.badgeRow}>
          <Clock size={13} color="#64748B" />
          <Text style={[styles.cellText, { color: theme.colors.text }]}>
            {' '}{item.startTime} - {item.endTime}
          </Text>
        </View>
      ),
    },
    {
      key: 'duration',
      title: 'Duration',
      width: 110,
      render: (_: any, item: Shift) => (
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{calculateDuration(item.startTime, item.endTime)}</Text>
        </View>
      ),
    },
    {
      key: 'tolerance',
      title: 'Late Grace',
      width: 110,
      render: (val: any, item: Shift) => (
        <Text style={[styles.cellTextSmall, { color: theme.colors.textSecondary }]}>
          {item.lateToleranceMinutes ?? 15} mins
        </Text>
      ),
    },
    {
      key: 'employees',
      title: 'Staff',
      width: 100,
      render: (_: any, item: Shift) => {
        const count = shiftEmployeeCount[item.id] || 0;
        return (
          <View style={styles.badgeRow}>
            <Users size={13} color="#64748B" />
            <Text style={[styles.badgeText, { color: theme.colors.text }]}> {count}</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Shuffle size={24} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.title, { color: theme.colors.text }]}>Work Shifts</Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Configure working hours, shifts, grace periods, and break schedules
          </Text>
        </View>

        <AppButton
          title="Add Shift"
          icon={<PlusCircle size={18} color="#FFFFFF" />}
          onPress={handleOpenAdd}
          style={styles.addButton}
        />
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#EEF2FF' }]}>
              <Clock size={20} color="#4F46E5" />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Configured Shifts</Text>
              <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{kpis.total}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#ECFDF5' }]}>
              <CheckCircle2 size={20} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Active Shifts</Text>
              <Text style={[styles.kpiValue, { color: '#10B981' }]}>{kpis.active}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FFF7ED' }]}>
              <Coffee size={20} color="#F97316" />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Daytime Shifts</Text>
              <Text style={[styles.kpiValue, { color: '#F97316' }]}>{kpis.morningCount}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filtersRow, { backgroundColor: theme.colors.card }]}>
        <View style={styles.filterTabs}>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((tab) => (
            <Pressable
              key={tab}
              style={[
                styles.filterTab,
                statusFilter === tab && { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary },
              ]}
              onPress={() => setStatusFilter(tab)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: statusFilter === tab ? theme.colors.primary : theme.colors.textSecondary },
                ]}
              >
                {tab === 'ALL' ? 'All Shifts' : tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Main Table */}
      <View style={styles.tableContainer}>
        <AdvancedTable
          data={filteredShifts}
          columns={columns}
          isLoading={isLoading}
          searchPlaceholder="Search shifts by name, timing or code..."
          searchValue={searchQuery}
          onSearch={setSearchQuery}
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

              <View style={styles.timingRow}>
                <Clock size={14} color="#64748B" />
                <Text style={[styles.timingText, { color: theme.colors.text }]}>
                  {' '}{item.startTime} - {item.endTime} ({calculateDuration(item.startTime, item.endTime)})
                </Text>
              </View>

              <View style={styles.mobileCardFooter}>
                <Text style={[styles.cellTextSmall, { color: theme.colors.textSecondary }]}>
                  Grace: {item.lateToleranceMinutes ?? 15}m | Break: {item.breakDurationMinutes ?? 60}m
                </Text>
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
        title={editingShift ? 'Edit Shift' : 'New Shift'}
      >
        <ScrollView style={styles.modalContent}>
          {formError ? (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#DC2626" />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          <AppInput
            label="Shift Name *"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Morning General"
          />

          <AppInput
            label="Shift Code *"
            value={code}
            onChangeText={setCode}
            placeholder="e.g. SHF-MG"
          />

          <View style={styles.twoColRow}>
            <View style={styles.col}>
              <AppInput
                label="Start Time (HH:MM) *"
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
              />
            </View>
            <View style={styles.col}>
              <AppInput
                label="End Time (HH:MM) *"
                value={endTime}
                onChangeText={setEndTime}
                placeholder="18:00"
              />
            </View>
          </View>

          <View style={styles.twoColRow}>
            <View style={styles.col}>
              <AppInput
                label="Late Grace (Minutes)"
                value={lateToleranceMinutes}
                onChangeText={setLateToleranceMinutes}
                placeholder="15"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.col}>
              <AppInput
                label="Break (Minutes)"
                value={breakDurationMinutes}
                onChangeText={setBreakDurationMinutes}
                placeholder="60"
                keyboardType="numeric"
              />
            </View>
          </View>

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

          <View style={styles.modalActions}>
            <AppButton
              title="Cancel"
              variant="outline"
              onPress={() => setIsModalVisible(false)}
              style={styles.modalBtn}
            />
            <AppButton
              title={editingShift ? 'Update Shift' : 'Create Shift'}
              onPress={handleSave}
              isLoading={addShiftMutation.isPending || updateShiftMutation.isPending}
              style={styles.modalBtn}
            />
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
    minWidth: 160,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kpiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: 12,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
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
  },
  durationBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
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
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  timingText: {
    fontSize: 13,
    fontWeight: '500',
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
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
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
