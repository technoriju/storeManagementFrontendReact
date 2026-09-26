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
import { SyncSettingsScreen } from '../features/settings/screens/SyncSettingsScreen';
import { initializeDatabase } from '../core/database/db';

const AuthenticatedApp = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loadingPermissions, setLoadingPermissions] = useState(true);

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
    if (activeTab === 'dashboard') {
      return <DashboardModule />;
    }
    if (activeTab === 'reports') {
      return <ReportsModule />;
    }
    if (activeTab === 'products') {
      return <ProductsModule />;
    }
    if (activeTab === 'purchases' || activeTab === 'purchase_order' || activeTab === 'purchase_return') {
      return <PurchasesModule initialScreen={activeTab} />;
    }
    if (activeTab === 'inventory') {
      return <InventoryModule />;
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
    if (activeTab === 'customers') {
      return <CustomersModule />;
    }
    if (activeTab === 'suppliers') {
      return <SuppliersModule />;
    }
    if (activeTab === 'settings') {
      return <SettingsModule />;
    }
    if (activeTab === 'sync_queue') {
      return <SyncSettingsScreen />;
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

  return isAuthenticated ? <AuthenticatedApp /> : <LoginScreen />;
};

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

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
  }
});


