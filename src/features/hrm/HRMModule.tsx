import React from 'react';
import { View, StyleSheet } from 'react-native';
import { EmployeeListScreen } from './screens/EmployeeListScreen';
import { DepartmentListScreen } from './screens/DepartmentListScreen';
import { DesignationListScreen } from './screens/DesignationListScreen';
import { ShiftListScreen } from './screens/ShiftListScreen';
import { AttendanceScreen } from './screens/AttendanceScreen';
import { LeaveScreen } from './screens/LeaveScreen';
import { HolidayScreen } from './screens/HolidayScreen';
import { PayrollScreen } from './screens/PayrollScreen';

interface HRMModuleProps {
  initialScreen?: string;
  onNavigateTab?: (tab: string, params?: any) => void;
  params?: any;
}

export const HRMModule: React.FC<HRMModuleProps> = ({
  initialScreen = 'employees',
  onNavigateTab,
  params,
}) => {
  const renderContent = () => {
    switch (initialScreen) {
      case 'add_employee':
        return <EmployeeListScreen key="add-emp" initialAction="add" />;
      case 'departments':
        return <DepartmentListScreen key="departments" />;
      case 'designation':
      case 'designations':
        return <DesignationListScreen key="designation" />;
      case 'shifts':
      case 'shift':
        return <ShiftListScreen key="shifts" />;
      case 'attendance':
      case 'attendance_list':
      case 'attendance_report':
        return <AttendanceScreen key="attendance" />;
      case 'leaves':
      case 'leave_list':
        return <LeaveScreen key="leaves-list" initialSubTab="leave_list" onNavigateTab={onNavigateTab} />;
      case 'leave_types':
        return <LeaveScreen key="leaves-types" initialSubTab="leave_types" onNavigateTab={onNavigateTab} />;
      case 'holidays':
        return <HolidayScreen key="holidays" />;
      case 'payroll':
      case 'payroll_list':
        return <PayrollScreen key="payroll-list" initialSubTab="payroll_list" onNavigateTab={onNavigateTab} />;
      case 'payroll_process':
        return <PayrollScreen key="payroll-process" initialSubTab="payroll_process" onNavigateTab={onNavigateTab} />;
      case 'employees':
      case 'employee_list':
      default:
        return <EmployeeListScreen key="employee-list" initialAction="list" />;
    }
  };

  return <View style={styles.container}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
