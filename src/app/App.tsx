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
    if (activeTab === 'products') {
      return <ProductsModule />;
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

export const App = () => {
  return (
    <ErrorBoundary>
      <RootNavigator />
    </ErrorBoundary>
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
