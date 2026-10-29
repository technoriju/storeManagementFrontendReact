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
import { Payroll } from '../../../types/models';
import {
  DollarSign,
  PlusCircle,
  Eye,
  CheckCircle,
  Trash2,
  Calendar,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Printer,
  X,
} from 'lucide-react-native';
import {
  usePayroll,
  useAddPayroll,
  useMarkPayrollPaid,
  useDeletePayroll,
} from '../api/usePayroll';
import { useEmployees } from '../api/useEmployees';

interface PayrollScreenProps {
  initialSubTab?: 'payroll_list' | 'payroll_process';
  onNavigateTab?: (tab: string, params?: any) => void;
}

export const PayrollScreen: React.FC<PayrollScreenProps> = ({ initialSubTab = 'payroll_list', onNavigateTab }) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const [activeTab, setActiveTab] = useState<'payroll_list' | 'payroll_process'>(initialSubTab);

  const { data: payrolls = [], isLoading } = usePayroll();
  const { data: employees = [] } = useEmployees();

  const addPayrollMutation = useAddPayroll();
  const markPaidMutation = useMarkPayrollPaid();
  const deletePayrollMutation = useDeletePayroll();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'GENERATED' | 'PENDING'>('ALL');

  // Modals
  const [isGenerateModalVisible, setIsGenerateModalVisible] = useState(false);
  const [isSlipModalVisible, setIsSlipModalVisible] = useState(false);
  const [viewingPayroll, setViewingPayroll] = useState<Payroll | null>(null);

  // Auto-handle initialSubTab for Process Payroll
  React.useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
      if (initialSubTab === 'payroll_process') {
        handleOpenGenerate();
      }
    }
  }, [initialSubTab]);

  const handleTabChange = (tab: 'payroll_list' | 'payroll_process') => {
    setActiveTab(tab);
    onNavigateTab?.(tab);
    if (tab === 'payroll_process') {
      handleOpenGenerate();
    }
  };

  // Form states for Generate Payroll
  const [employeeId, setEmployeeId] = useState<number | undefined>(undefined);
  const [month, setMonth] = useState('October');
  const [year, setYear] = useState('2026');
  const [basicSalary, setBasicSalary] = useState('0');
  const [allowances, setAllowances] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Live calculated net
  const netSalary = useMemo(() => {
    const b = parseFloat(basicSalary) || 0;
    const a = parseFloat(allowances) || 0;
    const d = parseFloat(deductions) || 0;
    return Math.max(0, b + a - d);
  }, [basicSalary, allowances, deductions]);

  // KPIs
  const kpis = useMemo(() => {
    let totalExpense = 0;
    let paidAmount = 0;
    let pendingCount = 0;

    for (const p of payrolls) {
      const net = Number(p.netSalary || 0);
      totalExpense += net;
      if (p.status === 'PAID') {
        paidAmount += net;
      } else {
        pendingCount++;
      }
    }

    return { totalExpense, paidAmount, pendingCount, totalRecords: payrolls.length };
  }, [payrolls]);

  const employeeOptions = useMemo(() => (
    employees.map((e) => ({
      label: `${e.firstName} ${e.lastName} (${e.employeeCode}) - ${e.departmentName || 'Staff'}`,
      value: e.id,
    }))
  ), [employees]);

  const statusOptions = [
    { label: 'All Slips', value: 'ALL' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Generated', value: 'GENERATED' },
    { label: 'Pending', value: 'PENDING' },
  ];

  // Filtered
  const filteredPayrolls = useMemo(() => {
    return payrolls.filter((p) => {
      if (!p) return false;
      const empName = (p.employeeName || '').toLowerCase();
      const deptName = (p.departmentName || '').toLowerCase();
      const monthStr = (p.month || '').toLowerCase();
      const yearStr = String(p.year || '');
      const q = searchQuery.toLowerCase();

      const matchSearch =
        empName.includes(q) ||
        deptName.includes(q) ||
        monthStr.includes(q) ||
        yearStr.includes(q);

      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [payrolls, searchQuery, statusFilter]);

  const handleOpenGenerate = () => {
    const firstEmp = employees[0];
    setEmployeeId(firstEmp?.id);
    setBasicSalary(String(firstEmp?.salary || 40000));
    setMonth('October');
    setYear('2026');
    setAllowances('3000');
    setDeductions('2000');
    setNotes('');
    setFormError('');
    setIsGenerateModalVisible(true);
  };

  const handleSelectEmployee = (empId: number) => {
    setEmployeeId(empId);
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      setBasicSalary(String(emp.salary || 40000));
    }
  };

  const handleSavePayroll = async () => {
    if (!employeeId) {
      setFormError('Please select an employee');
      return;
    }
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) {
      setFormError('Employee not found');
      return;
    }

    try {
      await addPayrollMutation.mutateAsync({
        employeeId,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        departmentName: emp.departmentName || '',
        designationName: emp.designationName || '',
        month,
        year: parseInt(year) || 2026,
        basicSalary: parseFloat(basicSalary) || 0,
        allowances: parseFloat(allowances) || 0,
        deductions: parseFloat(deductions) || 0,
        netSalary,
        status: 'GENERATED',
        notes: notes.trim(),
      });
      setIsGenerateModalVisible(false);
    } catch (err: any) {
      setFormError(err?.message || 'Error generating payroll');
    }
  };

  const handleMarkPaid = async (payroll: Payroll) => {
    const doPay = async () => {
      try {
        await markPaidMutation.mutateAsync({ id: payroll.id, paymentMethod: 'BANK_TRANSFER' });
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to mark as paid');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Disburse payroll of $${payroll.netSalary.toLocaleString()} to ${payroll.employeeName}?`)) {
        doPay();
      }
    } else {
      Alert.alert(
        'Confirm Disbursal',
        `Disburse salary of $${payroll.netSalary.toLocaleString()} to ${payroll.employeeName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Mark Paid', onPress: doPay },
        ]
      );
    }
  };

  const handleDelete = (payroll: Payroll) => {
    const doDelete = async () => {
      try {
        await deletePayrollMutation.mutateAsync(payroll.id);
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to delete');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete payroll slip for ${payroll.employeeName} (${payroll.month} ${payroll.year})?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Confirm Delete', `Delete payroll slip for ${payroll.employeeName}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleOpenSlip = (payroll: Payroll) => {
    setViewingPayroll(payroll);
    setIsSlipModalVisible(true);
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'PAID':
        return { bg: '#ECFDF5', text: '#10B981', label: 'Paid' };
      case 'GENERATED':
        return { bg: '#EEF2FF', text: '#4F46E5', label: 'Generated' };
      case 'PENDING':
      default:
        return { bg: '#FFFBEB', text: '#D97706', label: 'Pending' };
    }
  };

  const columns: AdvancedTableColumn<Payroll>[] = [
    {
      key: 'employeeName',
      title: 'Employee',
      flex: 1,
      minWidth: 160,
      render: (val: string, item: Payroll) => (
        <View>
          <Text style={[styles.cellTextBold, { color: theme.colors.text }]}>{val}</Text>
          <Text style={[styles.cellTextSmall, { color: theme.colors.textSecondary }]}>
            {item.designationName || item.departmentName || 'Staff'}
          </Text>
        </View>
      ),
    },
    {
      key: 'period',
      title: 'Pay Period',
      width: 140,
      render: (_: any, item: Payroll) => (
        <View style={styles.badgeRow}>
          <Calendar size={13} color="#64748B" />
          <Text style={[styles.cellText, { color: theme.colors.text }]}>
            {' '}{item.month} {item.year}
          </Text>
        </View>
      ),
    },
    {
      key: 'basicSalary',
      title: 'Basic Pay',
      width: 110,
      render: (val: number) => (
        <Text style={[styles.cellText, { color: theme.colors.text }]}>
          ${Number(val || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      key: 'netSalary',
      title: 'Net Salary',
      width: 120,
      render: (val: number) => (
        <Text style={[styles.cellTextBold, { color: '#10B981', fontSize: 14 }]}>
          ${Number(val || 0).toLocaleString()}
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
            <DollarSign size={24} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.title, { color: theme.colors.text }]}>Payroll Management</Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Generate monthly salary vouchers, allowances, deductions, and payment disbursals
          </Text>
        </View>

        <AppButton
          title="Process Payroll"
          icon={<PlusCircle size={18} color="#FFFFFF" />}
          onPress={handleOpenGenerate}
          style={styles.addButton}
        />
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiCard, styles.kpiCardBlue]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#DBEAFE' }]}>
              <DollarSign size={18} color="#2563EB" />
            </View>
            <View style={styles.kpiTextCol}>
              <Text style={[styles.kpiLabel, { color: '#1E40AF' }]}>Total Payroll</Text>
              <Text style={[styles.kpiValue, { color: '#1E3A8A' }]}>
                ${kpis.totalExpense.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, styles.kpiCardGreen]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#DCFCE7' }]}>
              <CheckCircle2 size={18} color="#16A34A" />
            </View>
            <View style={styles.kpiTextCol}>
              <Text style={[styles.kpiLabel, { color: '#166534' }]}>Disbursed / Paid</Text>
              <Text style={[styles.kpiValue, { color: '#14532D' }]}>
                ${kpis.paidAmount.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, styles.kpiCardAmber]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Clock size={18} color="#D97706" />
            </View>
            <View style={styles.kpiTextCol}>
              <Text style={[styles.kpiLabel, { color: '#92400E' }]}>Pending Slips</Text>
              <Text style={[styles.kpiValue, { color: '#78350F' }]}>{kpis.pendingCount}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Sub-tab navigation */}
      <View style={styles.subTabNav}>
        <Pressable
          style={[styles.subTabItem, activeTab === 'payroll_list' && styles.subTabItemActive]}
          onPress={() => handleTabChange('payroll_list')}
        >
          <FileText size={15} color={activeTab === 'payroll_list' ? theme.colors.primary : '#64748B'} />
          <Text style={[styles.subTabText, activeTab === 'payroll_list' && styles.subTabTextActive]}>
            Salary List ({payrolls.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.subTabItem, activeTab === 'payroll_process' && styles.subTabItemActive]}
          onPress={() => handleTabChange('payroll_process')}
        >
          <CreditCard size={15} color={activeTab === 'payroll_process' ? theme.colors.primary : '#64748B'} />
          <Text style={[styles.subTabText, activeTab === 'payroll_process' && styles.subTabTextActive]}>
            Process Payroll
          </Text>
        </Pressable>
      </View>

      {/* Main Table */}
      <View style={styles.tableContainer}>
        <AdvancedTable
          data={filteredPayrolls}
          columns={columns}
          isLoading={isLoading}
          searchPlaceholder="Search payroll by employee name, month or year..."
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
                onPress={() => handleOpenSlip(item)}
                style={[styles.actionBtn, { backgroundColor: '#F1F5F9' }]}
              >
                <Eye size={15} color="#475569" />
              </Pressable>

              {item.status !== 'PAID' && (
                <Pressable
                  onPress={() => handleMarkPaid(item)}
                  style={[styles.actionBtn, { backgroundColor: '#ECFDF5' }]}
                >
                  <CheckCircle size={15} color="#10B981" />
                </Pressable>
              )}

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
                    <Text style={[styles.cardCode, { color: theme.colors.primary }]}>
                      {item.month} {item.year}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: b.bg }]}>
                    <Text style={[styles.statusText, { color: b.text }]}>{b.label}</Text>
                  </View>
                </View>

                <View style={styles.mobileSalaries}>
                  <Text style={[styles.cellTextSmall, { color: theme.colors.textSecondary }]}>
                    Basic: ${item.basicSalary.toLocaleString()} | +Allow: ${item.allowances.toLocaleString()} | -Ded: ${item.deductions.toLocaleString()}
                  </Text>
                  <Text style={[styles.cellTextBold, { color: '#10B981', marginTop: 4, fontSize: 15 }]}>
                    Net: ${item.netSalary.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.mobileCardFooter}>
                  <Text style={[styles.cellTextSmall, { color: theme.colors.textSecondary }]}>
                    {item.paymentMethod || 'Unpaid'}
                  </Text>
                  <View style={styles.actionsRow}>
                    <Pressable onPress={() => handleOpenSlip(item)} style={[styles.actionBtn, { backgroundColor: '#F1F5F9' }]}>
                      <Eye size={15} color="#475569" />
                    </Pressable>
                    {item.status !== 'PAID' && (
                      <Pressable onPress={() => handleMarkPaid(item)} style={[styles.actionBtn, { backgroundColor: '#ECFDF5' }]}>
                        <CheckCircle size={15} color="#10B981" />
                      </Pressable>
                    )}
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

      {/* Process / Generate Payroll Dialog */}
      <AppDialog
        visible={isGenerateModalVisible}
        onClose={() => setIsGenerateModalVisible(false)}
        title="Generate Salary Voucher"
        maxWidth={640}
        compact={true}
        actions={
          <View style={styles.dialogActionsRow}>
            <AppButton
              title="Cancel"
              variant="outline"
              onPress={() => setIsGenerateModalVisible(false)}
              style={styles.dialogBtn}
            />
            <AppButton
              title="Generate Voucher"
              onPress={handleSavePayroll}
              isLoading={addPayrollMutation.isPending}
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

          {/* Select Employee */}
          <View style={styles.formGroup}>
            <AppSelect
              label="Select Staff Member *"
              placeholder="Search and select employee..."
              value={employeeId}
              options={employeeOptions}
              onSelect={(val) => handleSelectEmployee(Number(val))}
              searchable={true}
            />
          </View>

          <View style={styles.twoColRow}>
            <View style={styles.col}>
              <AppInput
                label="Pay Period Month *"
                value={month}
                onChangeText={setMonth}
                placeholder="October"
              />
            </View>
            <View style={styles.col}>
              <AppInput
                label="Year *"
                value={year}
                onChangeText={setYear}
                placeholder="2026"
                keyboardType="numeric"
              />
            </View>
          </View>

          <AppInput
            label="Basic Salary ($) *"
            value={basicSalary}
            onChangeText={setBasicSalary}
            placeholder="40000"
            keyboardType="numeric"
          />

          <View style={styles.twoColRow}>
            <View style={styles.col}>
              <AppInput
                label="Total Allowances ($)"
                value={allowances}
                onChangeText={setAllowances}
                placeholder="3000"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.col}>
              <AppInput
                label="Total Deductions ($)"
                value={deductions}
                onChangeText={setDeductions}
                placeholder="2000"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Net Salary Summary Box */}
          <View style={[styles.netSummaryBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <Text style={styles.netSummaryLabel}>Net Payable Salary</Text>
            <Text style={styles.netSummaryAmount}>${netSalary.toLocaleString()}</Text>
          </View>

          <AppInput
            label="Notes / Voucher Remark"
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. October monthly salary with performance bonus"
          />
        </ScrollView>
      </AppDialog>

      {/* Pay Slip View Modal */}
      <AppDialog
        visible={isSlipModalVisible}
        onClose={() => setIsSlipModalVisible(false)}
        title="Salary Pay Slip"
        maxWidth={540}
        compact={true}
        actions={
          <View style={styles.dialogActionsRow}>
            <AppButton
              title="Close"
              onPress={() => setIsSlipModalVisible(false)}
              style={styles.dialogBtn}
            />
          </View>
        }
      >
        {viewingPayroll && (
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.slipCard}>
              <View style={styles.slipHeader}>
                <View>
                  <Text style={styles.slipCompany}>PAYROLL SLIP</Text>
                  <Text style={styles.slipSub}>Period: {viewingPayroll.month} {viewingPayroll.year}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBadge(viewingPayroll.status).bg }]}>
                  <Text style={[styles.statusText, { color: getStatusBadge(viewingPayroll.status).text }]}>
                    {getStatusBadge(viewingPayroll.status).label}
                  </Text>
                </View>
              </View>

              <View style={styles.slipEmployeeBox}>
                <Text style={styles.slipEmpName}>{viewingPayroll.employeeName}</Text>
                <Text style={styles.slipEmpRole}>
                  {viewingPayroll.designationName || 'Staff'} • {viewingPayroll.departmentName || 'Department'}
                </Text>
              </View>

              <View style={styles.slipBreakdown}>
                <View style={styles.slipRow}>
                  <Text style={styles.slipLabel}>Basic Salary</Text>
                  <Text style={styles.slipVal}>${viewingPayroll.basicSalary.toLocaleString()}</Text>
                </View>
                <View style={styles.slipRow}>
                  <Text style={styles.slipLabel}>Total Allowances (+)</Text>
                  <Text style={[styles.slipVal, { color: '#10B981' }]}>+${viewingPayroll.allowances.toLocaleString()}</Text>
                </View>
                <View style={styles.slipRow}>
                  <Text style={styles.slipLabel}>Total Deductions (-)</Text>
                  <Text style={[styles.slipVal, { color: '#EF4444' }]}>-${viewingPayroll.deductions.toLocaleString()}</Text>
                </View>
                <View style={[styles.slipRow, styles.slipTotalRow]}>
                  <Text style={styles.slipTotalLabel}>NET DISBURSED PAY</Text>
                  <Text style={styles.slipTotalAmount}>${viewingPayroll.netSalary.toLocaleString()}</Text>
                </View>
              </View>

              {viewingPayroll.paymentDate ? (
                <View style={styles.slipFooterInfo}>
                  <Text style={styles.slipSmallText}>
                    Disbursed on: {viewingPayroll.paymentDate} via {viewingPayroll.paymentMethod || 'Direct Deposit'}
                  </Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
        )}
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
  kpiCardAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
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
  subTabNav: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
  },
  subTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subTabItemActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  mobileSalaries: {
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
    maxHeight: 500,
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
  netSummaryBox: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
    alignItems: 'center',
  },
  netSummaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
    textTransform: 'uppercase',
  },
  netSummaryAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#166534',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
  },
  slipCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  slipCompany: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#0F172A',
  },
  slipSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  slipEmployeeBox: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  slipEmpName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  slipEmpRole: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  slipBreakdown: {
    paddingVertical: 12,
    gap: 8,
  },
  slipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slipLabel: {
    fontSize: 13,
    color: '#475569',
  },
  slipVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  slipTotalRow: {
    borderTopWidth: 2,
    borderTopColor: '#0F172A',
    paddingTop: 8,
    marginTop: 6,
  },
  slipTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  slipTotalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10B981',
  },
  slipFooterInfo: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  slipSmallText: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
