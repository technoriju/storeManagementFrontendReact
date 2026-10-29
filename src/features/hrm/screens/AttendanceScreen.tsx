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
import { Attendance } from '../../../types/models';
import {
  UserCheck,
  PlusCircle,
  Edit,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Users,
  AlertCircle,
  X,
} from 'lucide-react-native';
import {
  useAttendance,
  useAddAttendance,
  useUpdateAttendance,
  useDeleteAttendance,
} from '../api/useAttendance';
import { useEmployees } from '../api/useEmployees';

interface AttendanceScreenProps {
  initialSubTab?: 'attendance_list' | 'attendance_report';
}

export const AttendanceScreen: React.FC<AttendanceScreenProps> = ({ initialSubTab }) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const { data: attendances = [], isLoading } = useAttendance();
  const { data: employees = [] } = useEmployees();

  const addAttMutation = useAddAttendance();
  const updateAttMutation = useUpdateAttendance();
  const deleteAttMutation = useDeleteAttendance();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE'>('ALL');

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAtt, setEditingAtt] = useState<Attendance | null>(null);

  // Form states
  const [employeeId, setEmployeeId] = useState<number | undefined>(undefined);
  const [date, setDate] = useState(todayStr);
  const [clockIn, setClockIn] = useState('09:00');
  const [clockOut, setClockOut] = useState('18:00');
  const [status, setStatus] = useState<'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE'>('PRESENT');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Daily attendances for the selected date
  const dateAttendances = useMemo(() => {
    return attendances.filter((a) => a.date === selectedDate);
  }, [attendances, selectedDate]);

  // KPI stats for selected date
  const kpis = useMemo(() => {
    const totalStaff = employees.length;
    const present = dateAttendances.filter((a) => a.status === 'PRESENT').length;
    const late = dateAttendances.filter((a) => a.status === 'LATE').length;
    const onLeave = dateAttendances.filter((a) => a.status === 'ON_LEAVE').length;
    const absent = Math.max(0, totalStaff - (present + late + onLeave));

    return { totalStaff, present, late, absent, onLeave };
  }, [employees, dateAttendances]);

  const employeeOptions = useMemo(() => (
    employees.map((e) => ({
      label: `${e.firstName} ${e.lastName} (${e.employeeCode})`,
      value: e.id,
    }))
  ), [employees]);

  const statusOptions = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Present', value: 'PRESENT' },
    { label: 'Late', value: 'LATE' },
    { label: 'On Leave', value: 'ON_LEAVE' },
    { label: 'Absent', value: 'ABSENT' },
  ];

  // Filtered attendance list
  const filteredAttendances = useMemo(() => {
    return attendances.filter((a) => {
      if (!a) return false;
      const empName = (a.employeeName || '').toLowerCase();
      const deptName = (a.departmentName || '').toLowerCase();
      const dateStr = a.date || '';
      const q = searchQuery.toLowerCase();

      const matchSearch =
        empName.includes(q) ||
        deptName.includes(q) ||
        dateStr.includes(q);

      const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
      const matchDate = selectedDate ? a.date === selectedDate : true;

      return matchSearch && matchStatus && matchDate;
    });
  }, [attendances, searchQuery, statusFilter, selectedDate]);

  const handleOpenAdd = () => {
    setEditingAtt(null);
    setEmployeeId(employees[0]?.id);
    setDate(selectedDate || todayStr);
    setClockIn('09:00');
    setClockOut('18:00');
    setStatus('PRESENT');
    setNotes('');
    setFormError('');
    setIsModalVisible(true);
  };

  const handleOpenEdit = (att: Attendance) => {
    setEditingAtt(att);
    setEmployeeId(att.employeeId);
    setDate(att.date);
    setClockIn(att.clockIn || '09:00');
    setClockOut(att.clockOut || '18:00');
    setStatus(att.status);
    setNotes(att.notes || '');
    setFormError('');
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!employeeId) {
      setFormError('Please select an employee');
      return;
    }
    if (!date) {
      setFormError('Date is required');
      return;
    }

    const emp = employees.find((e) => e.id === employeeId);
    const employeeName = emp ? `${emp.firstName} ${emp.lastName}` : '';
    const departmentName = emp?.departmentName || '';

    // Calculate hours
    let totalHours = 0;
    if (clockIn && clockOut && (status === 'PRESENT' || status === 'LATE')) {
      const [sh, sm] = clockIn.split(':').map(Number);
      const [eh, em] = clockOut.split(':').map(Number);
      let diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60;
      totalHours = Math.round((diff / 60) * 10) / 10;
    }

    try {
      if (editingAtt) {
        await updateAttMutation.mutateAsync({
          id: editingAtt.id,
          data: {
            clockIn,
            clockOut,
            status,
            totalHours,
            notes,
          },
        });
      } else {
        await addAttMutation.mutateAsync({
          employeeId,
          employeeName,
          departmentName,
          date,
          clockIn: status === 'ABSENT' || status === 'ON_LEAVE' ? undefined : clockIn,
          clockOut: status === 'ABSENT' || status === 'ON_LEAVE' ? undefined : clockOut,
          status,
          totalHours,
          notes,
        });
      }
      setIsModalVisible(false);
    } catch (err: any) {
      setFormError(err?.message || 'Error recording attendance');
    }
  };

  const handleDelete = (att: Attendance) => {
    const doDelete = async () => {
      try {
        await deleteAttMutation.mutateAsync(att.id);
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to delete');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete attendance record for ${att.employeeName} on ${att.date}?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Confirm Delete', `Delete attendance record for ${att.employeeName}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'PRESENT':
        return { bg: '#ECFDF5', text: '#10B981', label: 'Present' };
      case 'LATE':
        return { bg: '#FEF3C7', text: '#D97706', label: 'Late' };
      case 'HALF_DAY':
        return { bg: '#E0E7FF', text: '#4338CA', label: 'Half Day' };
      case 'ON_LEAVE':
        return { bg: '#F3E8FF', text: '#7E22CE', label: 'On Leave' };
      case 'ABSENT':
      default:
        return { bg: '#FEF2F2', text: '#EF4444', label: 'Absent' };
    }
  };

  const columns: AdvancedTableColumn<Attendance>[] = [
    {
      key: 'employeeName',
      title: 'Employee',
      flex: 1,
      minWidth: 160,
      render: (val: string, item: Attendance) => (
        <View>
          <Text style={[styles.cellTextBold, { color: theme.colors.text }]}>{val}</Text>
          <Text style={[styles.cellTextSmall, { color: theme.colors.textSecondary }]}>
            {item.departmentName || 'General Staff'}
          </Text>
        </View>
      ),
    },
    {
      key: 'date',
      title: 'Date',
      width: 120,
      render: (val: string) => (
        <View style={styles.badgeRow}>
          <Calendar size={13} color="#64748B" />
          <Text style={[styles.cellText, { color: theme.colors.text }]}> {val}</Text>
        </View>
      ),
    },
    {
      key: 'clockIn',
      title: 'In Time',
      width: 110,
      render: (val?: string) => (
        <Text style={[styles.cellText, { color: theme.colors.text }]}>{val || '—'}</Text>
      ),
    },
    {
      key: 'clockOut',
      title: 'Out Time',
      width: 110,
      render: (val?: string) => (
        <Text style={[styles.cellText, { color: theme.colors.text }]}>{val || '—'}</Text>
      ),
    },
    {
      key: 'totalHours',
      title: 'Hours',
      width: 90,
      render: (val?: number) => (
        <Text style={[styles.cellTextBold, { color: theme.colors.text }]}>
          {val ? `${val}h` : '—'}
        </Text>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      width: 110,
      render: (val: string) => {
        const b = getStatusBadge(val);
        return (
          <View style={[styles.statusBadge, { backgroundColor: b.bg }]}>
            <Text style={[styles.statusText, { color: b.text }]}>{b.label}</Text>
          </View>
        );
      },
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <UserCheck size={24} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.title, { color: theme.colors.text }]}>Attendance Tracker</Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Daily clock-in, late arrivals, working hours, and presence records
          </Text>
        </View>

        <AppButton
          title="Mark Attendance"
          icon={<PlusCircle size={18} color="#FFFFFF" />}
          onPress={handleOpenAdd}
          style={styles.addButton}
        />
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiCard, styles.kpiCardGreen]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#D1FAE5' }]}>
              <CheckCircle2 size={18} color="#059669" />
            </View>
            <View style={styles.kpiTextCol}>
              <Text style={styles.kpiLabel}>Present</Text>
              <Text style={[styles.kpiValue, { color: '#047857' }]}>{kpis.present}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, styles.kpiCardAmber]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Clock size={18} color="#D97706" />
            </View>
            <View style={styles.kpiTextCol}>
              <Text style={styles.kpiLabel}>Late</Text>
              <Text style={[styles.kpiValue, { color: '#B45309' }]}>{kpis.late}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, styles.kpiCardPurple]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#EDE9FE' }]}>
              <Calendar size={18} color="#7C3AED" />
            </View>
            <View style={styles.kpiTextCol}>
              <Text style={styles.kpiLabel}>On Leave</Text>
              <Text style={[styles.kpiValue, { color: '#6D28D9' }]}>{kpis.onLeave}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, styles.kpiCardRed]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FEE2E2' }]}>
              <XCircle size={18} color="#DC2626" />
            </View>
            <View style={styles.kpiTextCol}>
              <Text style={styles.kpiLabel}>Absent</Text>
              <Text style={[styles.kpiValue, { color: '#B91C1C' }]}>{kpis.absent}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main Table with integrated toolbar filters */}
      <View style={styles.tableContainer}>
        <AdvancedTable
          data={filteredAttendances}
          columns={columns}
          isLoading={isLoading}
          searchPlaceholder="Search attendance by employee or department..."
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          filters={
            <View style={[styles.tableFiltersRow, isMobile && styles.tableFiltersRowMobile]}>
              <View style={styles.dateSelectorBox}>
                <Calendar size={14} color={theme.colors.primary} />
                <Text style={[styles.dateText, { color: theme.colors.text }]}>Date: {selectedDate}</Text>
                {selectedDate !== todayStr && (
                  <Pressable
                    onPress={() => setSelectedDate(todayStr)}
                    style={styles.todayBtn}
                  >
                    <Text style={styles.todayBtnText}>Today</Text>
                  </Pressable>
                )}
              </View>
              <AppSelect
                placeholder="All Statuses"
                value={statusFilter}
                options={statusOptions}
                onSelect={(val) => setStatusFilter(val)}
                fullWidthDropdown={isMobile}
                containerStyle={[styles.filterSelect, isMobile ? { flex: 1, minWidth: 130 } : { width: 140 }]}
              />
              {(statusFilter !== 'ALL' || selectedDate !== todayStr) && (
                <Pressable
                  style={[styles.resetFilterBtn, { borderColor: theme.colors.border }]}
                  onPress={() => {
                    setSelectedDate(todayStr);
                    setStatusFilter('ALL');
                  }}
                >
                  <X size={14} color="#EF4444" />
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
          renderMobileCard={(item) => {
            const b = getStatusBadge(item.status);
            return (
              <View style={[styles.mobileCard, { backgroundColor: theme.colors.card }]}>
                <View style={styles.mobileCardHeader}>
                  <View>
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.employeeName}</Text>
                    <Text style={[styles.cardCode, { color: theme.colors.textSecondary }]}>{item.departmentName}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: b.bg }]}>
                    <Text style={[styles.statusText, { color: b.text }]}>{b.label}</Text>
                  </View>
                </View>

                <View style={styles.mobileTimes}>
                  <Text style={[styles.cellTextSmall, { color: theme.colors.text }]}>
                    In: {item.clockIn || '—'} | Out: {item.clockOut || '—'} ({item.totalHours ? `${item.totalHours} hrs` : '0 hrs'})
                  </Text>
                </View>

                <View style={styles.mobileCardFooter}>
                  <Text style={[styles.cellTextSmall, { color: theme.colors.textSecondary }]}>{item.date}</Text>
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
            );
          }}
        />
      </View>

      {/* Add / Edit Dialog */}
      <AppDialog
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title={editingAtt ? 'Edit Attendance Record' : 'Log Attendance'}
        maxWidth={600}
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
              title={editingAtt ? 'Save Changes' : 'Record Attendance'}
              onPress={handleSave}
              isLoading={addAttMutation.isPending || updateAttMutation.isPending}
              style={styles.dialogBtn}
            />
          </View>
        }
      >
        <View style={styles.modalBody}>
          {formError ? (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#DC2626" />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          <AppSelect
            label="Select Employee *"
            placeholder="Select an employee..."
            value={employeeId}
            options={employeeOptions}
            onSelect={(val) => setEmployeeId(val)}
            searchable
            containerStyle={{ marginBottom: 12 }}
          />

          <AppInput
            label="Date (YYYY-MM-DD) *"
            value={date}
            onChangeText={setDate}
            placeholder="2026-10-29"
          />

          <View style={[styles.twoColRow, isMobile && styles.colOnMobile]}>
            <View style={styles.col}>
              <AppInput
                label="Clock In (HH:MM)"
                value={clockIn}
                onChangeText={setClockIn}
                placeholder="09:00"
              />
            </View>
            <View style={styles.col}>
              <AppInput
                label="Clock Out (HH:MM)"
                value={clockOut}
                onChangeText={setClockOut}
                placeholder="18:00"
              />
            </View>
          </View>

          {/* Status Choice */}
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Attendance Status</Text>
            <View style={styles.statusChipsGrid}>
              {(['PRESENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'ABSENT'] as const).map((st) => (
                <Pressable
                  key={st}
                  style={[
                    styles.statusChipBtn,
                    status === st && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setStatus(st)}
                >
                  <Text style={[styles.statusChipText, { color: status === st ? '#FFFFFF' : theme.colors.text }]}>
                    {st.replace('_', ' ')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <AppInput
            label="Notes / Reason"
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Approved remote work or traffic delay"
          />
        </View>
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
    minWidth: 150,
  },
  kpiContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 140,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  kpiCardGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  kpiCardAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  kpiCardPurple: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  kpiCardRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
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
    fontWeight: '500',
    color: '#64748B',
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 1,
  },
  tableFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  tableFiltersRowMobile: {
    width: '100%',
  },
  dateSelectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  todayBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  todayBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  filterSelect: {
    marginBottom: 0,
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#FFF1F2',
  },
  resetFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  dialogActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    justifyContent: 'flex-end',
  },
  dialogBtn: {
    minWidth: 110,
  },
  modalBody: {
    paddingVertical: 4,
  },
  colOnMobile: {
    flexDirection: 'column',
    gap: 0,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tableContainer: {
    flex: 1,
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
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
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
    marginTop: 2,
  },
  mobileTimes: {
    marginTop: 8,
  },
  mobileCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
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
  chipRow: {
    maxHeight: 44,
  },
  empSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  deptChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  statusChipText: {
    fontSize: 12,
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
