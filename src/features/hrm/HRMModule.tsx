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
        return <EmployeeListScreen initialAction="add" />;
      case 'departments':
        return <DepartmentListScreen />;
      case 'designation':
      case 'designations':
        return <DesignationListScreen />;
      case 'shifts':
      case 'shift':
        return <ShiftListScreen />;
      case 'attendance':
      case 'attendance_list':
        return <AttendanceScreen initialSubTab="attendance_list" />;
      case 'attendance_report':
        return <AttendanceScreen initialSubTab="attendance_report" />;
      case 'leaves':
      case 'leave_list':
        return <LeaveScreen initialSubTab="leave_list" />;
      case 'leave_types':
        return <LeaveScreen initialSubTab="leave_types" />;
      case 'holidays':
        return <HolidayScreen />;
      case 'payroll':
      case 'payroll_list':
        return <PayrollScreen initialSubTab="payroll_list" />;
      case 'payroll_process':
        return <PayrollScreen initialSubTab="payroll_process" />;
      case 'employees':
      case 'employee_list':
      default:
        return <EmployeeListScreen initialAction="list" />;
    }
  };

  return <View style={styles.container}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
