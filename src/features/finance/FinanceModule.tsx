import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ExpenseListScreen } from './screens/ExpenseListScreen';
import { ExpenseCategoryListScreen } from './screens/ExpenseCategoryListScreen';
import { IncomeListScreen } from './screens/IncomeListScreen';
import { IncomeCategoryListScreen } from './screens/IncomeCategoryListScreen';

interface FinanceModuleProps {
  initialScreen?: string;
  onNavigateTab?: (tab: string) => void;
}

export const FinanceModule: React.FC<FinanceModuleProps> = ({ initialScreen = 'expenses' }) => {
  const renderContent = () => {
    switch (initialScreen) {
      case 'expense_category':
        return <ExpenseCategoryListScreen />;
      case 'income':
      case 'income_list':
        return <IncomeListScreen />;
      case 'income_category':
        return <IncomeCategoryListScreen />;
      case 'expenses':
      case 'expense_list':
      default:
        return <ExpenseListScreen />;
    }
  };

  return <View style={styles.container}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
