import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ExpenseListScreen } from './screens/ExpenseListScreen';
import { ExpenseCategoryListScreen } from './screens/ExpenseCategoryListScreen';
import { IncomeListScreen } from './screens/IncomeListScreen';
import { IncomeCategoryListScreen } from './screens/IncomeCategoryListScreen';
import { BankAccountListScreen } from './screens/BankAccountListScreen';
import { MoneyTransferListScreen } from './screens/MoneyTransferListScreen';
import { TrialBalanceScreen } from './screens/TrialBalanceScreen';
import { CashFlowScreen } from './screens/CashFlowScreen';
import { AccountStatementScreen } from './screens/AccountStatementScreen';

interface FinanceModuleProps {
  initialScreen?: string;
  onNavigateTab?: (tab: string, params?: any) => void;
  params?: any;
}

export const FinanceModule: React.FC<FinanceModuleProps> = ({
  initialScreen = 'expenses',
  onNavigateTab,
  params,
}) => {
  const renderContent = () => {
    switch (initialScreen) {
      case 'expense_category':
        return <ExpenseCategoryListScreen />;
      case 'income':
      case 'income_list':
        return <IncomeListScreen />;
      case 'income_category':
        return <IncomeCategoryListScreen />;
      case 'bank_accounts':
        return <BankAccountListScreen onNavigateTab={onNavigateTab} />;
      case 'money_transfer':
        return <MoneyTransferListScreen />;
      case 'trial_balance':
        return <TrialBalanceScreen />;
      case 'cash_flow':
        return <CashFlowScreen />;
      case 'account_statement':
        return <AccountStatementScreen initialAccountId={params?.accountId} />;
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
