import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { useAuthStore } from '../../../core/auth/auth.store';
import { hasPermission, SETTINGS_PERMISSIONS } from '../types/permissions';

// Import Screens
import { InvoiceSettingsScreen } from './InvoiceSettingsScreen';
import { UsersScreen } from './UsersScreen';
import { RolesScreen } from './RolesScreen';
import { PermissionsScreen } from './PermissionsScreen';
import { BusinessSettingsScreen } from './BusinessSettingsScreen';
import { BranchesScreen } from './BranchesScreen';
import { WarehousesScreen } from './WarehousesScreen';
import { GstSettingsScreen } from './GstSettingsScreen';
import { PrinterSettingsScreen } from './PrinterSettingsScreen';
import { SyncSettingsScreen } from './SyncSettingsScreen';

interface SettingRoute {
  id: string;
  label: string;
  group: string;
  permission: string;
  component: React.ReactNode;
}

const SETTING_ROUTES: SettingRoute[] = [
  { id: 'business', label: 'Business Profile', group: 'General', permission: SETTINGS_PERMISSIONS.VIEW_BUSINESS, component: <BusinessSettingsScreen /> },
  { id: 'gst', label: 'GST Configuration', group: 'General', permission: SETTINGS_PERMISSIONS.VIEW_GST, component: <GstSettingsScreen /> },
  
  { id: 'branches', label: 'Branches', group: 'Store Operations', permission: SETTINGS_PERMISSIONS.VIEW_BRANCHES, component: <BranchesScreen /> },
  { id: 'warehouses', label: 'Warehouses', group: 'Store Operations', permission: SETTINGS_PERMISSIONS.VIEW_WAREHOUSES, component: <WarehousesScreen /> },
  { id: 'printers', label: 'Printers', group: 'Store Operations', permission: SETTINGS_PERMISSIONS.VIEW_PRINTERS, component: <PrinterSettingsScreen /> },

  { id: 'invoice', label: 'Invoice Format', group: 'Billing & Sync', permission: SETTINGS_PERMISSIONS.VIEW_INVOICE, component: <InvoiceSettingsScreen /> },
  { id: 'sync', label: 'Sync Status', group: 'Billing & Sync', permission: SETTINGS_PERMISSIONS.VIEW_SYNC, component: <SyncSettingsScreen /> },

  { id: 'users', label: 'Users', group: 'Access Control', permission: SETTINGS_PERMISSIONS.VIEW_USERS, component: <UsersScreen /> },
  { id: 'roles', label: 'Roles', group: 'Access Control', permission: SETTINGS_PERMISSIONS.VIEW_ROLES, component: <RolesScreen /> },
  { id: 'permissions', label: 'Permissions', group: 'Access Control', permission: SETTINGS_PERMISSIONS.VIEW_PERMISSIONS, component: <PermissionsScreen /> },
];

export const SettingsLayout = () => {
  const theme = useTheme();
  const { isDesktop, isTablet } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;
  
  const { permissions } = useAuthStore();
  
  // Filter routes based on user permissions
  const availableRoutes = SETTING_ROUTES.filter(route => hasPermission(permissions, route.permission));
  
  const [activeRouteId, setActiveRouteId] = useState<string>(
    availableRoutes.length > 0 ? availableRoutes[0].id : ''
  );

  const activeRoute = availableRoutes.find(r => r.id === activeRouteId);

  // Group the available routes
  const groupedRoutes = availableRoutes.reduce((acc, route) => {
    if (!acc[route.group]) {
      acc[route.group] = [];
    }
    acc[route.group].push(route);
    return acc;
  }, {} as Record<string, SettingRoute[]>);

  if (availableRoutes.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          You don't have permission to view any settings.
        </Text>
      </View>
    );
  }

  const renderSidebar = () => (
    <ScrollView style={[styles.sidebar, { borderRightColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sidebarTitle, { color: theme.colors.text }]}>Settings</Text>
      
      {Object.entries(groupedRoutes).map(([group, routes]) => (
        <View key={group} style={styles.groupContainer}>
          <Text style={[styles.groupLabel, { color: theme.colors.textSecondary }]}>{group}</Text>
          {routes.map(route => {
            const isActive = route.id === activeRouteId;
            return (
              <TouchableOpacity
                key={route.id}
                style={[
                  styles.navItem,
                  isActive && { backgroundColor: theme.colors.primary + '1A', borderRightColor: theme.colors.primary, borderRightWidth: 2 }
                ]}
                onPress={() => setActiveRouteId(route.id)}
              >
                <Text style={[
                  styles.navText,
                  { color: isActive ? theme.colors.primary : theme.colors.text },
                  isActive && { fontWeight: '600' }
                ]}>
                  {route.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );

  if (!isLargeScreen) {
    // On mobile, if we are in a sub-route, show the back button and the content.
    // Otherwise show the list. This is a simple state-based stack navigation.
    const [isListView, setIsListView] = useState(true);

    if (isListView) {
      return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <ScrollView style={styles.mobileList}>
             {Object.entries(groupedRoutes).map(([group, routes]) => (
              <View key={group} style={styles.groupContainer}>
                <Text style={[styles.groupLabel, { color: theme.colors.textSecondary }]}>{group}</Text>
                {routes.map(route => (
                  <TouchableOpacity
                    key={route.id}
                    style={[styles.mobileNavItem, { borderBottomColor: theme.colors.border }]}
                    onPress={() => {
                      setActiveRouteId(route.id);
                      setIsListView(false);
                    }}
                  >
                    <Text style={[styles.mobileNavText, { color: theme.colors.text }]}>
                      {route.label}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary }}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.mobileHeader, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => setIsListView(true)} style={styles.backBtn}>
            <Text style={{ color: theme.colors.primary, fontSize: 16 }}>← Settings</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.contentArea}>
          {activeRoute?.component}
        </View>
      </View>
    );
  }

  // Desktop / Tablet Master-Detail view
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.twoColumnLayout}>
        {renderSidebar()}
        <View style={styles.contentArea}>
          {activeRoute?.component}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16 },
  twoColumnLayout: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 260,
    borderRightWidth: 1,
    paddingVertical: 24,
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: '600',
    paddingHorizontal: 24,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  groupContainer: {
    marginBottom: 24,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  navItem: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  navText: {
    fontSize: 15,
  },
  contentArea: {
    flex: 1,
  },
  mobileList: {
    flex: 1,
    padding: 20,
  },
  mobileNavItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  mobileNavText: {
    fontSize: 16,
  },
  mobileHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingVertical: 8,
  }
});
