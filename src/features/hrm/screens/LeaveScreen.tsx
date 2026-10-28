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
import { LeaveRequest, LeaveType } from '../../../types/models';
import {
  Calendar,
  PlusCircle,
  Check,
  X,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Layers,
} from 'lucide-react-native';
import {
  useLeaves,
  useLeaveTypes,
  useAddLeave,
  useUpdateLeaveStatus,
  useDeleteLeave,
  useAddLeaveType,
} from '../api/useLeaves';
import { useEmployees } from '../api/useEmployees';

interface LeaveScreenProps {
  initialSubTab?: 'leave_list' | 'leave_types';
}

export const LeaveScreen: React.FC<LeaveScreenProps> = ({ initialSubTab = 'leave_list' }) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const [activeTab, setActiveTab] = useState<'leave_list' | 'leave_types'>(initialSubTab);

  const { data: leaves = [], isLoading: isLoadingLeaves } = useLeaves();
  const { data: leaveTypes = [], isLoading: isLoadingTypes } = useLeaveTypes();
  const { data: employees = [] } = useEmployees();

  const addLeaveMutation = useAddLeave();
  const updateLeaveStatusMutation = useUpdateLeaveStatus();
  const deleteLeaveMutation = useDeleteLeave();
  const addLeaveTypeMutation = useAddLeaveType();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Apply Leave Modal
  const [isApplyModalVisible, setIsApplyModalVisible] = useState(false);
  const [employeeId, setEmployeeId] = useState<number | undefined>(undefined);
  const [leaveTypeId, setLeaveTypeId] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalDays, setTotalDays] = useState('1');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');

  // Add Leave Type Modal
  const [isTypeModalVisible, setIsTypeModalVisible] = useState(false);
  const [typeName, setTypeName] = useState('');
  const [daysAllowed, setDaysAllowed] = useState('12');
  const [typeDescription, setTypeDescription] = useState('');
  const [typeFormError, setTypeFormError] = useState('');

  // KPIs
  const kpis = useMemo(() => {
    const total = leaves.length;
    const pending = leaves.filter((l) => l.status === 'PENDING').length;
    const approved = leaves.filter((l) => l.status === 'APPROVED').length;
    const rejected = leaves.filter((l) => l.status === 'REJECTED').length;
    return { total, pending, approved, rejected };
  }, [leaves]);

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      if (!l) return false;
      const empName = (l.employeeName || '').toLowerCase();
      const ltName = (l.leaveTypeName || '').toLowerCase();
      const reason = (l.reason || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchSearch =
        empName.includes(q) ||
        ltName.includes(q) ||
        reason.includes(q);

      const matchStatus = statusFilter === 'ALL' || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [leaves, searchQuery, statusFilter]);

  const handleOpenApply = () => {
    setEmployeeId(employees[0]?.id);
    setLeaveTypeId(leaveTypes[0]?.id);
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    setTotalDays('1');
    setReason('');
    setFormError('');
    setIsApplyModalVisible(true);
  };

  const handleOpenAddType = () => {
    setTypeName('');
    setDaysAllowed('12');
    setTypeDescription('');
    setTypeFormError('');
    setIsTypeModalVisible(true);
  };

  const handleSaveLeave = async () => {
    if (!employeeId) {
      setFormError('Please select an employee');
      return;
    }
    if (!leaveTypeId) {
      setFormError('Please select a leave type');
      return;
    }
    if (!reason.trim()) {
      setFormError('Reason for leave is required');
      return;
    }

    const emp = employees.find((e) => e.id === employeeId);
    const lt = leaveTypes.find((t) => t.id === leaveTypeId);

    try {
      await addLeaveMutation.mutateAsync({
        employeeId,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : '',
        departmentName: emp?.departmentName || '',
        leaveTypeId,
        leaveTypeName: lt?.name || 'Casual Leave',
        startDate,
        endDate,
        totalDays: parseFloat(totalDays) || 1,
        reason: reason.trim(),
        status: 'PENDING',
      });
      setIsApplyModalVisible(false);
    } catch (err: any) {
      setFormError(err?.message || 'Error submitting leave');
    }
  };

  const handleSaveType = async () => {
    if (!typeName.trim()) {
      setTypeFormError('Leave type name is required');
      return;
    }
    try {
      await addLeaveTypeMutation.mutateAsync({
        name: typeName.trim(),
        daysAllowed: parseInt(daysAllowed) || 12,
        description: typeDescription.trim(),
        status: 'ACTIVE',
      });
      setIsTypeModalVisible(false);
    } catch (err: any) {
      setTypeFormError(err?.message || 'Error creating leave type');
    }
  };

  const handleStatusChange = async (leave: LeaveRequest, status: 'APPROVED' | 'REJECTED') => {
    try {
      await updateLeaveStatusMutation.mutateAsync({ id: leave.id, status });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update leave status');
    }
  };

  const handleDeleteLeave = (leave: LeaveRequest) => {
    const doDelete = async () => {
      try {
        await deleteLeaveMutation.mutateAsync(leave.id);
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to delete');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete leave request from ${leave.employeeName}?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Confirm Delete', `Delete leave request from ${leave.employeeName}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'APPROVED':
        return { bg: '#ECFDF5', text: '#10B981', label: 'Approved' };
      case 'REJECTED':
        return { bg: '#FEF2F2', text: '#EF4444', label: 'Rejected' };
      case 'PENDING':
      default:
        return { bg: '#FFFBEB', text: '#D97706', label: 'Pending' };
    }
  };

  const leaveColumns: AdvancedTableColumn<LeaveRequest>[] = [
    {
      key: 'employeeName',
      title: 'Employee',
      flex: 1,
      minWidth: 160,
      render: (val: string, item: LeaveRequest) => (
        <View>
          <Text style={[styles.cellTextBold, { color: theme.colors.text }]}>{val}</Text>
          <Text style={[styles.cellTextSmall, { color: theme.colors.textSecondary }]}>
            {item.departmentName || 'General Staff'}
          </Text>
        </View>
      ),
    },
    {
      key: 'leaveTypeName',
      title: 'Leave Type',
      width: 140,
      render: (val: string) => (
        <View style={styles.typeBadge}>
          <Text style={[styles.typeText, { color: theme.colors.primary }]}>{val}</Text>
        </View>
      ),
    },
    {
      key: 'dates',
      title: 'Period',
      width: 170,
      render: (_: any, item: LeaveRequest) => (
        <View>
          <Text style={[styles.cellText, { color: theme.colors.text }]}>
            {item.startDate} to {item.endDate}
          </Text>
          <Text style={[styles.cellTextSmall, { color: theme.colors.textSecondary }]}>
            {item.totalDays} day{item.totalDays > 1 ? 's' : ''}
          </Text>
        </View>
      ),
    },
    {
      key: 'reason',
      title: 'Reason',
      flex: 1,
      minWidth: 140,
      render: (val: string) => (
        <Text style={[styles.cellText, { color: theme.colors.text }]} numberOfLines={2}>
          {val}
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

  const typeColumns: AdvancedTableColumn<LeaveType>[] = [
    {
      key: 'name',
      title: 'Leave Name',
      flex: 1,
      minWidth: 160,
      render: (val: string, item: LeaveType) => (
        <View>
          <Text style={[styles.cellTextBold, { color: theme.colors.text }]}>{val}</Text>
          {item.description ? (
            <Text style={[styles.cellTextSmall, { color: theme.colors.textSecondary }]}>{item.description}</Text>
          ) : null}
        </View>
      ),
    },
    {
      key: 'daysAllowed',
      title: 'Annual Quota',
      width: 130,
      render: (val: number) => (
        <View style={styles.quotaBadge}>
          <Text style={styles.quotaText}>{val} Days / yr</Text>
        </View>
      ),
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
            <Calendar size={24} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.title, { color: theme.colors.text }]}>Leaves Management</Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Review employee time-off requests, balances, and company leave policies
          </Text>
        </View>

        <View style={styles.headerActions}>
          {activeTab === 'leave_list' ? (
            <AppButton
              title="Apply Leave"
              icon={<PlusCircle size={18} color="#FFFFFF" />}
              onPress={handleOpenApply}
              style={styles.addButton}
            />
          ) : (
            <AppButton
              title="Add Leave Type"
              icon={<PlusCircle size={18} color="#FFFFFF" />}
              onPress={handleOpenAddType}
              style={styles.addButton}
            />
          )}
        </View>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#EEF2FF' }]}>
              <FileText size={20} color="#4F46E5" />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Requests</Text>
              <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{kpis.total}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FFFBEB' }]}>
              <Clock size={20} color="#D97706" />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Pending</Text>
              <Text style={[styles.kpiValue, { color: '#D97706' }]}>{kpis.pending}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#ECFDF5' }]}>
              <CheckCircle2 size={20} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Approved</Text>
              <Text style={[styles.kpiValue, { color: '#10B981' }]}>{kpis.approved}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FEF2F2' }]}>
              <XCircle size={20} color="#EF4444" />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Rejected</Text>
              <Text style={[styles.kpiValue, { color: '#EF4444' }]}>{kpis.rejected}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Sub Tabs: Leave Requests vs Leave Types */}
      <View style={[styles.subTabNav, { backgroundColor: theme.colors.card }]}>
        <Pressable
          style={[
            styles.subTabItem,
            activeTab === 'leave_list' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
          ]}
          onPress={() => setActiveTab('leave_list')}
        >
          <Text style={[styles.subTabText, { color: activeTab === 'leave_list' ? '#FFFFFF' : theme.colors.text }]}>
            Leave Requests ({leaves.length})
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.subTabItem,
            activeTab === 'leave_types' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
          ]}
          onPress={() => setActiveTab('leave_types')}
        >
          <Text style={[styles.subTabText, { color: activeTab === 'leave_types' ? '#FFFFFF' : theme.colors.text }]}>
            Leave Types & Policies ({leaveTypes.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'leave_list' ? (
        <View style={styles.tableContainer}>
          <AdvancedTable
            data={filteredLeaves}
            columns={leaveColumns}
            isLoading={isLoadingLeaves}
            searchPlaceholder="Search leave requests by employee, type or reason..."
            searchValue={searchQuery}
            onSearch={setSearchQuery}
            renderRowActions={(item) => (
              <View style={styles.actionsRow}>
                {item.status === 'PENDING' && (
                  <>
                    <Pressable
                      onPress={() => handleStatusChange(item, 'APPROVED')}
                      style={[styles.actionBtn, { backgroundColor: '#ECFDF5' }]}
                    >
                      <Check size={15} color="#10B981" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleStatusChange(item, 'REJECTED')}
                      style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}
                    >
                      <X size={15} color="#EF4444" />
                    </Pressable>
                  </>
                )}
                <Pressable
                  onPress={() => handleDeleteLeave(item)}
                  style={[styles.actionBtn, { backgroundColor: '#F1F5F9' }]}
                >
                  <Trash2 size={15} color="#64748B" />
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
                      <Text style={[styles.cardCode, { color: theme.colors.primary }]}>{item.leaveTypeName}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: b.bg }]}>
                      <Text style={[styles.statusText, { color: b.text }]}>{b.label}</Text>
                    </View>
                  </View>

                  <Text style={[styles.cardPeriod, { color: theme.colors.textSecondary }]}>
                    {item.startDate} to {item.endDate} ({item.totalDays} day{item.totalDays > 1 ? 's' : ''})
                  </Text>

                  <Text style={[styles.cardReason, { color: theme.colors.text }]}>
                    {item.reason}
                  </Text>

                  <View style={styles.mobileCardFooter}>
                    <View style={styles.actionsRow}>
                      {item.status === 'PENDING' && (
                        <>
                          <Pressable
                            onPress={() => handleStatusChange(item, 'APPROVED')}
                            style={[styles.actionBtn, { backgroundColor: '#ECFDF5' }]}
                          >
                            <Check size={15} color="#10B981" />
                          </Pressable>
                          <Pressable
                            onPress={() => handleStatusChange(item, 'REJECTED')}
                            style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}
                          >
                            <X size={15} color="#EF4444" />
                          </Pressable>
                        </>
                      )}
                      <Pressable onPress={() => handleDeleteLeave(item)} style={[styles.actionBtn, { backgroundColor: '#F1F5F9' }]}>
                        <Trash2 size={15} color="#64748B" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        </View>
      ) : (
        <View style={styles.tableContainer}>
          <AdvancedTable
            data={leaveTypes}
            columns={typeColumns}
            isLoading={isLoadingTypes}
            searchPlaceholder="Search leave policies..."
          />
        </View>
      )}

      {/* Apply Leave Dialog */}
      <AppDialog
        visible={isApplyModalVisible}
        onClose={() => setIsApplyModalVisible(false)}
        title="Apply for Leave"
      >
        <ScrollView style={styles.modalContent}>
          {formError ? (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#DC2626" />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          {/* Select Employee */}
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Employee *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {employees.map((e) => (
                <Pressable
                  key={e.id}
                  style={[
                    styles.empSelectChip,
                    employeeId === e.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setEmployeeId(e.id)}
                >
                  <Text style={[styles.chipText, { color: employeeId === e.id ? '#FFFFFF' : theme.colors.text }]}>
                    {e.firstName} {e.lastName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Select Leave Type */}
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Leave Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {leaveTypes.map((lt) => (
                <Pressable
                  key={lt.id}
                  style={[
                    styles.empSelectChip,
                    leaveTypeId === lt.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setLeaveTypeId(lt.id)}
                >
                  <Text style={[styles.chipText, { color: leaveTypeId === lt.id ? '#FFFFFF' : theme.colors.text }]}>
                    {lt.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.twoColRow}>
            <View style={styles.col}>
              <AppInput
                label="Start Date (YYYY-MM-DD) *"
                value={startDate}
                onChangeText={setStartDate}
                placeholder="2026-11-01"
              />
            </View>
            <View style={styles.col}>
              <AppInput
                label="End Date (YYYY-MM-DD) *"
                value={endDate}
                onChangeText={setEndDate}
                placeholder="2026-11-03"
              />
            </View>
          </View>

          <AppInput
            label="Total Days"
            value={totalDays}
            onChangeText={setTotalDays}
            placeholder="1"
            keyboardType="numeric"
          />

          <AppInput
            label="Reason for Leave *"
            value={reason}
            onChangeText={setReason}
            placeholder="Describe reason for time off"
            multiline
            numberOfLines={3}
          />

          <View style={styles.modalActions}>
            <AppButton
              title="Cancel"
              variant="outline"
              onPress={() => setIsApplyModalVisible(false)}
              style={styles.modalBtn}
            />
            <AppButton
              title="Submit Request"
              onPress={handleSaveLeave}
              isLoading={addLeaveMutation.isPending}
              style={styles.modalBtn}
            />
          </View>
        </ScrollView>
      </AppDialog>

      {/* Add Leave Type Dialog */}
      <AppDialog
        visible={isTypeModalVisible}
        onClose={() => setIsTypeModalVisible(false)}
        title="Add Leave Policy Type"
      >
        <ScrollView style={styles.modalContent}>
          {typeFormError ? (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#DC2626" />
              <Text style={styles.errorText}>{typeFormError}</Text>
            </View>
          ) : null}

          <AppInput
            label="Leave Type Name *"
            value={typeName}
            onChangeText={setTypeName}
            placeholder="e.g. Annual Privilege Leave"
          />

          <AppInput
            label="Allowed Days per Year *"
            value={daysAllowed}
            onChangeText={setDaysAllowed}
            placeholder="15"
            keyboardType="numeric"
          />

          <AppInput
            label="Policy Description"
            value={typeDescription}
            onChangeText={setTypeDescription}
            placeholder="Rules and guidelines for this leave category"
            multiline
            numberOfLines={3}
          />

          <View style={styles.modalActions}>
            <AppButton
              title="Cancel"
              variant="outline"
              onPress={() => setIsTypeModalVisible(false)}
              style={styles.modalBtn}
            />
            <AppButton
              title="Create Policy"
              onPress={handleSaveType}
              isLoading={addLeaveTypeMutation.isPending}
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
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
    minWidth: 140,
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
  subTabNav: {
    flexDirection: 'row',
    padding: 6,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  subTabItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tableContainer: {
    flex: 1,
  },
  typeBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quotaBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  quotaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
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
  cardPeriod: {
    fontSize: 12,
    marginTop: 6,
  },
  cardReason: {
    fontSize: 13,
    marginTop: 4,
  },
  mobileCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
  chipText: {
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
