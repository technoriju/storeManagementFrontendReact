import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAuthStore } from '../../../core/auth/auth.store';

export const Sidebar = ({ activeItem, onItemPress, isDrawer }: any) => {
  const theme = useTheme();
  const { logout } = useAuthStore();

  const items = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'products', label: 'Products' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'purchases', label: 'Purchases' },
    { id: 'pos', label: 'POS' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <View style={[
      styles.container, 
      { backgroundColor: theme.colors.surface, borderRightColor: theme.colors.border },
      isDrawer && styles.drawerContainer
    ]}>
      <ScrollView style={{ flex: 1 }}>
        {items.map((item: any) => {
          const isActive = activeItem === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.item,
                { padding: theme.spacing.md },
                isActive && { backgroundColor: theme.colors.primary + '1A', borderRightWidth: 3, borderRightColor: theme.colors.primary }
              ]}
              onPress={() => onItemPress?.(item.id)}
            >
              <Text style={{ 
                color: isActive ? theme.colors.primary : theme.colors.textSecondary,
                fontWeight: isActive ? (theme.typography.weights.semiBold as any) : (theme.typography.weights.medium as any)
              }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.item, { padding: theme.spacing.md }]}
          onPress={logout}
        >
          <Text style={{ 
            color: theme.colors.error,
            fontWeight: theme.typography.weights.medium as any
          }}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: 250, borderRightWidth: 1, height: '100%', flexDirection: 'column' },
  drawerContainer: { width: '100%', borderRightWidth: 0 },
  item: { flexDirection: 'row', alignItems: 'center' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
  }
});
