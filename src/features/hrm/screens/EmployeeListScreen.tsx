import React, { useState, useMemo, useEffect } from 'react';
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
import { Employee } from '../../../types/models';
import {
  Users,
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  DollarSign,
  Building,
  Briefcase,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  UserX,
} from 'lucide-react-native';
import {
  useEmployees,
  useAddEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from '../api/useEmployees';
import { useDepartments } from '../api/useDepartments';
import { useDesignations } from '../api/useDesignations';
import { useShifts } from '../api/useShifts';

interface EmployeeListScreenProps {
  initialAction?: 'add' | 'list';
}

export const EmployeeListScreen: React.FC<EmployeeListScreenProps> = ({ initialAction }) => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();

  const { data: employees = [], isLoading } = useEmployees();
  const { data: departments = [] } = useDepartments();
  const { data: designations = [] } = useDesignations();
  const { data: shifts = [] } = useShifts();

  const addEmpMutation = useAddEmployee();
  const updateEmpMutation = useUpdateEmployee();
  const deleteEmpMutation = useDeleteEmployee();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE'>('ALL');
  const [selectedDeptId, setSelectedDeptId] = useState<number | 'ALL'>('ALL');

  // Modals
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [viewingEmp, setViewingEmp] = useState<Employee | null>(null);

  // Form states
  const [employeeCode, setEmployeeCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);
  const [designationId, setDesignationId] = useState<number | undefined>(undefined);
  const [shiftId, setShiftId] = useState<number | undefined>(undefined);
  const [joiningDate, setJoiningDate] = useState('');
  const [salary, setSalary] = useState('');
  const [employmentType, setEmploymentType] = useState<'FULL_TIME' | 'PART_TIME' | 'CONTRACT'>('FULL_TIME');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ON_LEAVE'>('ACTIVE');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [formError, setFormError] = useState('');

  // Handle open add if initialAction is 'add'
  useEffect(() => {
    if (initialAction === 'add') {
      handleOpenAdd();
    }
  }, [initialAction]);

  // KPI stats
  const kpis = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.status === 'ACTIVE').length;
    const onLeave = employees.filter((e) => e.status === 'ON_LEAVE').length;
    const totalSalary = employees.reduce((sum, e) => sum + Number(e.salary || 0), 0);
    return { total, active, onLeave, totalSalary };
  }, [employees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (!e) return false;
      const fullName = `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase();
      const code = (e.employeeCode || '').toLowerCase();
      const email = (e.email || '').toLowerCase();
      const phone = e.phone || '';
      const q = searchQuery.toLowerCase();

      const matchSearch =
        fullName.includes(q) ||
        code.includes(q) ||
        email.includes(q) ||
        phone.includes(q);

      const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
      const matchDept = selectedDeptId === 'ALL' || e.departmentId === selectedDeptId;

      return matchSearch && matchStatus && matchDept;
    });
  }, [employees, searchQuery, statusFilter, selectedDeptId]);

  const handleOpenAdd = () => {
    setEditingEmp(null);
    setEmployeeCode(`EMP-${(employees.length + 1).toString().padStart(3, '0')}`);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setDepartmentId(departments[0]?.id);
    setDesignationId(designations[0]?.id);
    setShiftId(shifts[0]?.id);
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setSalary('40000');
    setEmploymentType('FULL_TIME');
    setStatus('ACTIVE');
    setAddress('');
    setEmergencyContact('');
    setFormError('');
    setIsModalVisible(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setEmployeeCode(emp.employeeCode);
    setFirstName(emp.firstName);
    setLastName(emp.lastName);
    setEmail(emp.email);
    setPhone(emp.phone);
    setDepartmentId(emp.departmentId);
    setDesignationId(emp.designationId);
    setShiftId(emp.shiftId);
    setJoiningDate(emp.joiningDate || new Date().toISOString().split('T')[0]);
    setSalary(String(emp.salary || '0'));
    setEmploymentType(emp.employmentType || 'FULL_TIME');
    setStatus(emp.status);
    setAddress(emp.address || '');
    setEmergencyContact(emp.emergencyContact || '');
    setFormError('');
    setIsModalVisible(true);
  };

  const handleOpenView = (emp: Employee) => {
    setViewingEmp(emp);
    setIsViewModalVisible(true);
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      setFormError('First name is required');
      return;
    }
    if (!lastName.trim()) {
      setFormError('Last name is required');
      return;
    }
    if (!employeeCode.trim()) {
      setFormError('Employee code is required');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Valid email address is required');
      return;
    }
    if (!phone.trim()) {
      setFormError('Contact phone is required');
      return;
    }

    const deptObj = departments.find((d) => d.id === departmentId);
    const desigObj = designations.find((d) => d.id === designationId);
    const shiftObj = shifts.find((s) => s.id === shiftId);

    const payload: Partial<Employee> = {
      employeeCode: employeeCode.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      departmentId,
      departmentName: deptObj?.name || '',
      designationId,
      designationName: desigObj?.name || '',
      shiftId,
      shiftName: shiftObj?.name || '',
      joiningDate: joiningDate.trim(),
      salary: parseFloat(salary) || 0,
      employmentType,
      status,
      address: address.trim(),
      emergencyContact: emergencyContact.trim(),
    };

    try {
      if (editingEmp) {
        await updateEmpMutation.mutateAsync({
          id: editingEmp.id,
          data: payload,
        });
      } else {
        await addEmpMutation.mutateAsync(payload);
      }
      setIsModalVisible(false);
    } catch (err: any) {
      setFormError(err?.message || 'Error saving employee');
    }
  };

  const handleDelete = (emp: Employee) => {
    const doDelete = async () => {
      try {
        await deleteEmpMutation.mutateAsync(emp.id);
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to delete');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete employee ${emp.firstName} ${emp.lastName} (${emp.employeeCode})?`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Confirm Delete',
        `Delete employee ${emp.firstName} ${emp.lastName} (${emp.employeeCode})?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const getStatusBadgeStyle = (st: string) => {
    switch (st) {
      case 'ACTIVE':
        return { bg: '#ECFDF5', text: '#10B981', label: 'Active' };
      case 'ON_LEAVE':
        return { bg: '#FFFBEB', text: '#D97706', label: 'On Leave' };
      case 'INACTIVE':
      default:
        return { bg: '#FEF2F2', text: '#EF4444', label: 'Inactive' };
    }
  };

  const columns: AdvancedTableColumn<Employee>[] = [
    {
      key: 'employeeCode',
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
      title: 'Employee Name',
      flex: 1,
      minWidth: 180,
      render: (_: any, item: Employee) => {
        const fn = item?.firstName || '';
        const ln = item?.lastName || '';
        const initials = `${fn[0] || ''}${ln[0] || ''}`.toUpperCase() || 'EM';
        return (
          <View style={styles.employeeCell}>
            <View style={[styles.avatarBox, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{initials}</Text>
            </View>
            <View>
              <Text style={[styles.cellTextBold, { color: theme.colors.text }]}>
                {fn} {ln}
              </Text>
              <Text style={[styles.cellTextSmall, { color: theme.colors.textSecondary }]}>
                {item?.email || '—'}
              </Text>
            </View>
          </View>
        );
      },
    },
    {
      key: 'department',
      title: 'Department & Role',
      width: 180,
      render: (_: any, item: Employee) => (
        <View>
          <Text style={[styles.cellTextBold, { color: theme.colors.text }]}>
            {item.designationName || 'General Staff'}
          </Text>
          <Text style={[styles.cellTextSmall, { color: theme.colors.textSecondary }]}>
            {item.departmentName || 'General'}
          </Text>
        </View>
      ),
    },
    {
      key: 'shift',
      title: 'Shift',
      width: 140,
      render: (_: any, item: Employee) => (
        <View style={styles.badgeRow}>
          <Clock size={12} color="#64748B" />
          <Text style={[styles.cellTextSmall, { color: theme.colors.text }]}>
            {' '}{item.shiftName || 'Morning'}
          </Text>
        </View>
      ),
    },
    {
      key: 'salary',
      title: 'Salary',
      width: 120,
      render: (val: number) => (
        <Text style={[styles.cellTextBold, { color: theme.colors.text }]}>
          ${Number(val || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      width: 110,
      render: (val: string) => {
        const b = getStatusBadgeStyle(val);
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
            <Users size={24} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.title, { color: theme.colors.text }]}>Employees Directory</Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Manage staff members, roles, departments, shifts, and compensation
          </Text>
        </View>

        <AppButton
          title="Add Employee"
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
              <Users size={20} color="#4F46E5" />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Staff</Text>
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
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Active Now</Text>
              <Text style={[styles.kpiValue, { color: '#10B981' }]}>{kpis.active}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FFFBEB' }]}>
              <Clock size={20} color="#D97706" />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>On Leave</Text>
              <Text style={[styles.kpiValue, { color: '#D97706' }]}>{kpis.onLeave}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FFF7ED' }]}>
              <DollarSign size={20} color="#F97316" />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Payroll Base</Text>
              <Text style={[styles.kpiValue, { color: '#F97316' }]}>${kpis.totalSalary.toLocaleString()}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Filter Tabs & Department Bar */}
      <View style={[styles.filtersRow, { backgroundColor: theme.colors.card }]}>
        <View style={styles.filterTabs}>
          {(['ALL', 'ACTIVE', 'ON_LEAVE', 'INACTIVE'] as const).map((tab) => (
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
                {tab === 'ALL' ? 'All' : tab.replace('_', ' ')}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptFilterBar}>
          <Pressable
            style={[
              styles.deptChip,
              selectedDeptId === 'ALL' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
            ]}
            onPress={() => setSelectedDeptId('ALL')}
          >
            <Text style={[styles.deptChipText, { color: selectedDeptId === 'ALL' ? '#FFFFFF' : theme.colors.text }]}>
              All Departments
            </Text>
          </Pressable>
          {departments.map((d) => (
            <Pressable
              key={d.id}
              style={[
                styles.deptChip,
                selectedDeptId === d.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
              ]}
              onPress={() => setSelectedDeptId(d.id)}
            >
              <Text style={[styles.deptChipText, { color: selectedDeptId === d.id ? '#FFFFFF' : theme.colors.text }]}>
                {d.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Main Table */}
      <View style={styles.tableContainer}>
        <AdvancedTable
          data={filteredEmployees}
          columns={columns}
          isLoading={isLoading}
          searchPlaceholder="Search employees by name, code, email, phone..."
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          renderRowActions={(item) => (
            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => handleOpenView(item)}
                style={[styles.actionBtn, { backgroundColor: '#F1F5F9' }]}
              >
                <Eye size={15} color="#475569" />
              </Pressable>
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
            const b = getStatusBadgeStyle(item?.status || 'ACTIVE');
            const fn = item?.firstName || '';
            const ln = item?.lastName || '';
            const initials = `${fn[0] || ''}${ln[0] || ''}`.toUpperCase() || 'EM';
            return (
              <View style={[styles.mobileCard, { backgroundColor: theme.colors.card }]}>
                <View style={styles.mobileCardHeader}>
                  <View style={styles.employeeCell}>
                    <View style={[styles.avatarBox, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{initials}</Text>
                    </View>
                    <View>
                      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                        {fn} {ln}
                      </Text>
                      <Text style={[styles.cardCode, { color: theme.colors.primary }]}>{item?.employeeCode || '—'}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: b.bg }]}>
                    <Text style={[styles.statusText, { color: b.text }]}>{b.label}</Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.badgeRow}>
                    <Briefcase size={13} color="#64748B" />
                    <Text style={[styles.cellTextSmall, { color: theme.colors.text }]}>
                      {' '}{item.designationName || 'Role'} • {item.departmentName || 'Dept'}
                    </Text>
                  </View>
                  <View style={styles.badgeRow}>
                    <Phone size={13} color="#64748B" />
                    <Text style={[styles.cellTextSmall, { color: theme.colors.textSecondary }]}>
                      {' '}{item.phone}
                    </Text>
                  </View>
                </View>

                <View style={styles.mobileCardFooter}>
                  <Text style={[styles.cellTextBold, { color: theme.colors.text }]}>
                    ${Number(item.salary || 0).toLocaleString()} /mo
                  </Text>
                  <View style={styles.actionsRow}>
                    <Pressable onPress={() => handleOpenView(item)} style={[styles.actionBtn, { backgroundColor: '#F1F5F9' }]}>
                      <Eye size={15} color="#475569" />
                    </Pressable>
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
        title={editingEmp ? 'Edit Employee Details' : 'Add New Employee'}
      >
        <ScrollView style={styles.modalContent}>
          {formError ? (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#DC2626" />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          <View style={styles.twoColRow}>
            <View style={styles.col}>
              <AppInput
                label="First Name *"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="e.g. Alex"
              />
            </View>
            <View style={styles.col}>
              <AppInput
                label="Last Name *"
                value={lastName}
                onChangeText={setLastName}
                placeholder="e.g. Morgan"
              />
            </View>
          </View>

          <View style={styles.twoColRow}>
            <View style={styles.col}>
              <AppInput
                label="Employee Code *"
                value={employeeCode}
                onChangeText={setEmployeeCode}
                placeholder="e.g. EMP-001"
              />
            </View>
            <View style={styles.col}>
              <AppInput
                label="Work Email *"
                value={email}
                onChangeText={setEmail}
                placeholder="alex.m@example.com"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.twoColRow}>
            <View style={styles.col}>
              <AppInput
                label="Phone Number *"
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 555-0101"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.col}>
              <AppInput
                label="Monthly Salary ($)"
                value={salary}
                onChangeText={setSalary}
                placeholder="45000"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Department Selector */}
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Department</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {departments.map((d) => (
                <Pressable
                  key={d.id}
                  style={[
                    styles.deptSelectChip,
                    departmentId === d.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setDepartmentId(d.id)}
                >
                  <Text style={[styles.deptChipText, { color: departmentId === d.id ? '#FFFFFF' : theme.colors.text }]}>
                    {d.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Designation Selector */}
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Designation</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {designations.map((d) => (
                <Pressable
                  key={d.id}
                  style={[
                    styles.deptSelectChip,
                    designationId === d.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setDesignationId(d.id)}
                >
                  <Text style={[styles.deptChipText, { color: designationId === d.id ? '#FFFFFF' : theme.colors.text }]}>
                    {d.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Shift Selector */}
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Shift</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {shifts.map((s) => (
                <Pressable
                  key={s.id}
                  style={[
                    styles.deptSelectChip,
                    shiftId === s.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setShiftId(s.id)}
                >
                  <Text style={[styles.deptChipText, { color: shiftId === s.id ? '#FFFFFF' : theme.colors.text }]}>
                    {s.name} ({s.startTime}-{s.endTime})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.twoColRow}>
            <View style={styles.col}>
              <AppInput
                label="Joining Date (YYYY-MM-DD)"
                value={joiningDate}
                onChangeText={setJoiningDate}
                placeholder="2026-01-15"
              />
            </View>
            <View style={styles.col}>
              <AppInput
                label="Emergency Contact"
                value={emergencyContact}
                onChangeText={setEmergencyContact}
                placeholder="Name / Phone"
              />
            </View>
          </View>

          <AppInput
            label="Residential Address"
            value={address}
            onChangeText={setAddress}
            placeholder="Street address, City, Postal Code"
          />

          {/* Status Toggle */}
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
                  status === 'ON_LEAVE' && { backgroundColor: '#D97706', borderColor: '#D97706' },
                ]}
                onPress={() => setStatus('ON_LEAVE')}
              >
                <Text style={[styles.toggleBtnText, { color: status === 'ON_LEAVE' ? '#FFFFFF' : theme.colors.text }]}>
                  On Leave
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
              title={editingEmp ? 'Save Changes' : 'Register Employee'}
              onPress={handleSave}
              isLoading={addEmpMutation.isPending || updateEmpMutation.isPending}
              style={styles.modalBtn}
            />
          </View>
        </ScrollView>
      </AppDialog>

      {/* View Details Dialog */}
      <AppDialog
        visible={isViewModalVisible}
        onClose={() => setIsViewModalVisible(false)}
        title="Employee Profile"
      >
        {viewingEmp && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.profileHeader}>
              <View style={[styles.profileAvatar, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.profileAvatarText}>
                  {`${(viewingEmp.firstName || '')[0] || ''}${(viewingEmp.lastName || '')[0] || ''}`.toUpperCase() || 'EM'}
                </Text>
              </View>
              <View style={{ marginLeft: 16 }}>
                <Text style={[styles.profileName, { color: theme.colors.text }]}>
                  {viewingEmp.firstName} {viewingEmp.lastName}
                </Text>
                <Text style={[styles.profileCode, { color: theme.colors.primary }]}>
                  {viewingEmp.employeeCode}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeStyle(viewingEmp.status).bg, marginTop: 4 }]}>
                  <Text style={[styles.statusText, { color: getStatusBadgeStyle(viewingEmp.status).text }]}>
                    {getStatusBadgeStyle(viewingEmp.status).label}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.detailsSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Employment Info</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Department:</Text>
                <Text style={[styles.detailVal, { color: theme.colors.text }]}>{viewingEmp.departmentName || '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Designation:</Text>
                <Text style={[styles.detailVal, { color: theme.colors.text }]}>{viewingEmp.designationName || '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Shift Schedule:</Text>
                <Text style={[styles.detailVal, { color: theme.colors.text }]}>{viewingEmp.shiftName || '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Joining Date:</Text>
                <Text style={[styles.detailVal, { color: theme.colors.text }]}>{viewingEmp.joiningDate || '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Salary / Wage:</Text>
                <Text style={[styles.detailVal, { color: theme.colors.text, fontWeight: '700' }]}>
                  ${Number(viewingEmp.salary || 0).toLocaleString()} / month
                </Text>
              </View>
            </View>

            <View style={styles.detailsSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Contact & Personal</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Email:</Text>
                <Text style={[styles.detailVal, { color: theme.colors.text }]}>{viewingEmp.email}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Phone:</Text>
                <Text style={[styles.detailVal, { color: theme.colors.text }]}>{viewingEmp.phone}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Address:</Text>
                <Text style={[styles.detailVal, { color: theme.colors.text }]}>{viewingEmp.address || '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Emergency Contact:</Text>
                <Text style={[styles.detailVal, { color: theme.colors.text }]}>{viewingEmp.emergencyContact || '—'}</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <AppButton
                title="Close"
                onPress={() => setIsViewModalVisible(false)}
                style={styles.modalBtn}
              />
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
    padding: 8,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
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
  deptFilterBar: {
    maxHeight: 40,
  },
  deptChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deptChipText: {
    fontSize: 12,
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
  employeeCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
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
    fontWeight: '600',
    marginTop: 2,
  },
  cardDetails: {
    marginTop: 8,
    gap: 4,
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
    maxHeight: 520,
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
  deptSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  statusToggleRow: {
    flexDirection: 'row',
    gap: 8,
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileCode: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsSection: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  detailKey: {
    fontSize: 13,
  },
  detailVal: {
    fontSize: 13,
  },
});
