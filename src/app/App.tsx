import React, { useState, useEffect } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from 'react-native';
import { ErrorBoundary } from '../core/ErrorBoundary';
import { useTheme } from '../shared/theme/theme';
import { getPlatform } from '../shared/utils/platform';
import { AppShell } from '../shared/components/layout/AppShell';
import { useAuthStore } from '../core/auth/auth.store';
import { AuthService } from '../core/auth/auth.service';
import { setupInterceptors } from '../core/api/api-client';
import { LoginScreen } from '../features/auth/screens/LoginScreen';

import { ProductsModule } from '../features/products';
import { PurchasesModule } from '../features/purchases/PurchasesModule';
import { InventoryModule } from '../features/inventory/InventoryModule';
import { CategoryModule } from '../features/category/CategoryModule';
import { SubCategoryModule } from '../features/sub_category/SubCategoryModule';
import { BrandsModule } from '../features/brands/BrandsModule';
import { UnitsModule } from '../features/units/UnitsModule';
import { SubUnitsModule } from '../features/sub_units/SubUnitsModule';
import { POSModule } from '../features/pos/POSModule';
import { CustomersModule } from '../features/customers/CustomersModule';
import { SuppliersModule } from '../features/suppliers/SuppliersModule';
import { SettingsModule } from '../features/settings/SettingsModule';
import { DashboardModule } from '../features/dashboard/DashboardModule';
import { ReportsModule } from '../features/reports/ReportsModule';
import { FinanceModule } from '../features/finance/FinanceModule';
import { HRMModule } from '../features/hrm/HRMModule';
import { SyncSettingsScreen } from '../features/settings/screens/SyncSettingsScreen';
import { LocalDbManager } from '../features/settings/screens/LocalDbManager';
import { PrintBarcodeScreen } from '../features/barcode';
import { UserManagementModule } from '../features/users-roles';
import { usePermissions } from '../core/auth/usePermissions';
import { ShieldAlert } from 'lucide-react-native';
import { AppButton } from '../shared/components/inputs/AppButton';
import { initializeDatabase } from '../core/database/db';

const getRequiredPermissionForTab = (tab: string): string | null => {
  if (tab === 'dashboard') return 'dashboard:view';
  if (
    tab === 'products' ||
    tab === 'create_product' ||
    tab === 'add_product' ||
    tab === 'expired_products' ||
    tab === 'low_stocks' ||
    tab === 'category' ||
    tab === 'sub_category' ||
    tab === 'brands' ||
    tab === 'units' ||
    tab === 'sub_units' ||
    tab === 'variant_attributes' ||
    tab === 'warranties' ||
    tab === 'print_barcode' ||
    tab === 'print_qr_code'
  ) return 'inventory:view';

  if (
    tab === 'manage_stock' ||
    tab === 'inventory' ||
    tab === 'stock_adjustment' ||
    tab === 'stock_transfer' ||
    tab === 'stock'
  ) return 'stock:manage';

  if (
    tab === 'pos' ||
    tab === 'sales' ||
    tab === 'invoices' ||
    tab === 'sales_return' ||
    tab === 'quotation'
  ) return 'sales:view';

  if (
    tab === 'purchases' ||
    tab === 'purchase' ||
    tab === 'purchase_order' ||
    tab === 'purchase_return'
  ) return 'purchases:view';

  if (
    tab === 'expenses' ||
    tab === 'expense_list' ||
    tab === 'expense_category' ||
    tab === 'income' ||
    tab === 'income_list' ||
    tab === 'income_category' ||
    tab === 'bank_accounts' ||
    tab === 'money_transfer' ||
    tab === 'trial_balance' ||
    tab === 'cash_flow' ||
    tab === 'account_statement' ||
    tab === 'balance_sheet' ||
    tab === 'balancesheet'
  ) return 'finance:view';

  if (
    tab === 'customers' ||
    tab === 'customer_payment' ||
    tab === 'customer_payments' ||
    tab === 'payment' ||
    tab === 'suppliers' ||
    tab === 'supplier_payment' ||
    tab === 'supplier_payments' ||
    tab === 'stores' ||
    tab === 'warehouses'
  ) return 'customers:manage';

  if (
    tab === 'employees' ||
    tab === 'employee_list' ||
    tab === 'add_employee' ||
    tab === 'departments' ||
    tab === 'designation' ||
    tab === 'designations' ||
    tab === 'shifts' ||
    tab === 'shift' ||
    tab === 'attendance' ||
    tab === 'attendance_list' ||
    tab === 'attendance_report' ||
    tab === 'leaves' ||
    tab === 'leave_list' ||
    tab === 'leave_types' ||
    tab === 'holidays' ||
    tab === 'payroll' ||
    tab === 'payroll_list' ||
    tab === 'payroll_process'
  ) return 'hrm:view';

  if (
    tab === 'reports' ||
    tab === 'sales_report' ||
    tab === 'customer_wise' ||
    tab === 'purchase_report' ||
    tab === 'supplier_wise' ||
    tab === 'inventory_report' ||
    tab === 'invoice_report' ||
    tab === 'customer_report' ||
    tab === 'supplier_report' ||
    tab === 'product_report' ||
    tab === 'payment_report' ||
    tab === 'expense_report' ||
    tab === 'income_report' ||
    tab === 'tax_report' ||
    tab === 'profit_loss' ||
    tab === 'annual_report'
  ) return 'reports:view';

  if (tab === 'users') return 'users:view';
  if (tab === 'roles_permissions' || tab === 'roles') return 'roles:view';

  if (
    tab === 'settings' ||
    tab === 'invoice_preview' ||
    tab === 'invoice' ||
    tab === 'business' ||
    tab === 'printers' ||
    tab.startsWith('settings_')
  ) return 'settings:general';

  return null;
};

const AuthenticatedApp = () => {
  const theme = useTheme();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tabParams, setTabParams] = useState<any>(null);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  const handleNavigateTab = (tab: string, params?: any) => {
    setTabParams(params || null);
    setActiveTab(tab);
  };

  useEffect(() => {
    const loadPerms = async () => {
      setLoadingPermissions(true);
      await AuthService.loadPermissions();
      setLoadingPermissions(false);
    };
    loadPerms();
  }, []);

  if (loadingPermissions) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: theme.colors.text }}>Loading permissions...</Text>
      </View>
    );
  }

  const renderContent = () => {
    const requiredPermission = getRequiredPermissionForTab(activeTab);
    if (requiredPermission && !can(requiredPermission)) {
      return (
        <View style={[styles.accessDeniedContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.accessDeniedCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.accessDeniedIconBox}>
              <ShieldAlert size={42} color="#D32F2F" />
            </View>
            <Text style={[styles.accessDeniedTitle, { color: theme.colors.text }]}>
              Access Restricted
            </Text>
            <Text style={[styles.accessDeniedSubtitle, { color: theme.colors.textSecondary }]}>
              You do not have permission ({requiredPermission}) to view or manage this module. Please contact your system administrator to adjust your role privileges.
            </Text>
            <View style={{ marginTop: 20 }}>
              <AppButton
                title="Back to Dashboard"
                onPress={() => setActiveTab('dashboard')}
                size="medium"
              />
            </View>
          </View>
        </View>
      );
    }
    if (activeTab === 'dashboard') {
      return <DashboardModule onNavigateTab={setActiveTab} />;
    }
    if (
      activeTab === 'reports' ||
      activeTab === 'sales_report' ||
      activeTab === 'customer_wise' ||
      activeTab === 'purchase_report' ||
      activeTab === 'supplier_wise' ||
      activeTab === 'inventory_report' ||
      activeTab === 'invoice_report' ||
      activeTab === 'customer_report' ||
      activeTab === 'supplier_report' ||
      activeTab === 'product_report' ||
      activeTab === 'payment_report' ||
      activeTab === 'expense_report' ||
      activeTab === 'income_report' ||
      activeTab === 'tax_report' ||
      activeTab === 'profit_loss' ||
      activeTab === 'annual_report' ||
      activeTab === 'balance_sheet' ||
      activeTab === 'balancesheet'
    ) {
      const reportId = activeTab === 'balance_sheet' || activeTab === 'balancesheet' ? 'profit_loss' : activeTab;
      return <ReportsModule initialReport={reportId} onNavigateReport={setActiveTab} />;
    }
    if (activeTab === 'products' || activeTab === 'create_product' || activeTab === 'add_product') {
      return <ProductsModule initialScreen={activeTab} onNavigateTab={setActiveTab} />;
    }
    if (activeTab === 'purchases' || activeTab === 'purchase' || activeTab === 'purchase_order' || activeTab === 'purchase_return') {
      return <PurchasesModule initialScreen={activeTab} />;
    }
    if (
      activeTab === 'manage_stock' ||
      activeTab === 'inventory' ||
      activeTab === 'stock_adjustment' ||
      activeTab === 'stock_transfer' ||
      activeTab === 'low_stocks' ||
      activeTab === 'stock'
    ) {
      return <InventoryModule initialScreen={activeTab === 'stock' ? 'manage_stock' : activeTab} />;
    }
    if (activeTab === 'category') {
      return <CategoryModule />;
    }
    if (activeTab === 'sub_category') {
      return <SubCategoryModule />;
    }
    if (activeTab === 'brands') {
      return <BrandsModule />;
    }
    if (activeTab === 'units') {
      return <UnitsModule />;
    }
    if (activeTab === 'sub_units') {
      return <SubUnitsModule />;
    }
    if (activeTab === 'pos' || activeTab === 'sales' || activeTab === 'invoices' || activeTab === 'sales_return' || activeTab === 'quotation') {
      return <POSModule initialScreen={activeTab} />;
    }
    if (
      activeTab === 'customers' ||
      activeTab === 'customer_payment' ||
      activeTab === 'customer_payments' ||
      activeTab === 'payment'
    ) {
      return <CustomersModule initialScreen={activeTab === 'payment' ? 'customer_payment' : activeTab} />;
    }
    if (activeTab === 'suppliers' || activeTab === 'supplier_payment' || activeTab === 'supplier_payments') {
      return <SuppliersModule initialScreen={activeTab} />;
    }
    if (
      activeTab === 'expenses' ||
      activeTab === 'expense_list' ||
      activeTab === 'expense_category' ||
      activeTab === 'income' ||
      activeTab === 'income_list' ||
      activeTab === 'income_category' ||
      activeTab === 'bank_accounts' ||
      activeTab === 'money_transfer' ||
      activeTab === 'trial_balance' ||
      activeTab === 'cash_flow' ||
      activeTab === 'account_statement'
    ) {
      return (
        <FinanceModule
          initialScreen={activeTab}
          onNavigateTab={handleNavigateTab}
          params={tabParams}
        />
      );
    }
    if (
      activeTab === 'employees' ||
      activeTab === 'employee_list' ||
      activeTab === 'add_employee' ||
      activeTab === 'departments' ||
      activeTab === 'designation' ||
      activeTab === 'designations' ||
      activeTab === 'shifts' ||
      activeTab === 'shift' ||
      activeTab === 'attendance' ||
      activeTab === 'attendance_list' ||
      activeTab === 'attendance_report' ||
      activeTab === 'leaves' ||
      activeTab === 'leave_list' ||
      activeTab === 'leave_types' ||
      activeTab === 'holidays' ||
      activeTab === 'payroll' ||
      activeTab === 'payroll_list' ||
      activeTab === 'payroll_process'
    ) {
      return (
        <HRMModule
          initialScreen={activeTab}
          onNavigateTab={handleNavigateTab}
          params={tabParams}
        />
      );
    }

    if (
      activeTab === 'settings' ||
      activeTab === 'invoice_preview' ||
      activeTab === 'invoice' ||
      activeTab === 'business' ||
      activeTab === 'printers' ||
      activeTab.startsWith('settings_')
    ) {
      return <SettingsModule initialRoute={activeTab} />;
    }
    if (activeTab === 'print_barcode' || activeTab === 'print_qr_code') {
      return <PrintBarcodeScreen onNavigateTab={handleNavigateTab} />;
    }
    if (
      activeTab === 'users' ||
      activeTab === 'roles_permissions' ||
      activeTab === 'roles'
    ) {
      return (
        <UserManagementModule
          initialScreen={activeTab}
          onNavigateTab={handleNavigateTab}
        />
      );
    }

    if (activeTab === 'sync_queue') {
      return <SyncSettingsScreen />;
    }
    if (activeTab === 'view_local_db' || activeTab === 'delete_local_db') {
      return <LocalDbManager action={activeTab} />;
    }
    
    return (
      <View style={styles.content}>
        <Text style={[
          styles.title, 
          { 
            color: theme.colors.text,
            fontSize: theme.typography.sizes.xxl,
            fontWeight: theme.typography.weights.bold as any
          }
        ]}>
          {activeTab.toUpperCase()}
        </Text>
        
        <Text style={[
          styles.subtitle,
          { color: theme.colors.textSecondary }
        ]}>
          Running on {getPlatform()}
        </Text>
      </View>
    );
  };

  return (
    <>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
        {renderContent()}
      </AppShell>
    </>
  );
};

import { syncEngine } from '../core/sync/SyncEngine';
import { initSettingsFromDb } from '../features/settings/store/invoiceSettings.store';
import { PWAInstallBanner } from '../shared/components/PWAInstallBanner';

const RootNavigator = () => {
  const { isInitializing, isAuthenticated, initialize, logout } = useAuthStore();
  const theme = useTheme();

  useEffect(() => {
    setupInterceptors(() => {
      // Called when unauthorized/refresh fails
      logout();
    });
    initialize();
    initializeDatabase();
    initSettingsFromDb();
    
    // Initialize SyncEngine
    syncEngine.init();
    
    return () => {
      syncEngine.destroy();
    };
  }, [initialize, logout]);

  if (isInitializing) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      {isAuthenticated ? <AuthenticatedApp /> : <LoginScreen />}
      <PWAInstallBanner />
    </>
  );
};

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RootNavigator />
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 40,
    textAlign: 'center',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accessDeniedCard: {
    width: '100%',
    maxWidth: 440,
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  accessDeniedIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  accessDeniedSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});


