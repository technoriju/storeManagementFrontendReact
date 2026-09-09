import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';

export const PermissionsScreen = () => {
  const theme = useTheme();

  // Mock data showing a matrix of permissions for roles
  const modules = [
    {
      name: 'Inventory',
      permissions: [
        { label: 'View Products', roles: { admin: true, manager: true, cashier: false } },
        { label: 'Edit Products', roles: { admin: true, manager: true, cashier: false } },
        { label: 'Manage Stock', roles: { admin: true, manager: true, cashier: false } },
      ]
    },
    {
      name: 'Point of Sale',
      permissions: [
        { label: 'Process Sales', roles: { admin: true, manager: true, cashier: true } },
        { label: 'Apply Discounts', roles: { admin: true, manager: true, cashier: false } },
        { label: 'Void Transactions', roles: { admin: true, manager: true, cashier: false } },
      ]
    }
  ];

  const rolesList = ['Admin', 'Manager', 'Cashier'];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Permissions</Text>
      </View>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Fine-tune access levels by configuring what each role can do across the system.
      </Text>

      <View style={styles.matrixContainer}>
        {/* Table Header */}
        <View style={[styles.matrixHeader, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.permissionCol}><Text style={[styles.headerText, { color: theme.colors.textSecondary }]}>Permission</Text></View>
          {rolesList.map(role => (
            <View key={role} style={styles.roleCol}>
              <Text style={[styles.headerText, { color: theme.colors.textSecondary }]}>{role}</Text>
            </View>
          ))}
        </View>

        {/* Modules */}
        {modules.map((mod, i) => (
          <View key={mod.name} style={styles.moduleSection}>
            <Text style={[styles.moduleTitle, { color: theme.colors.text, backgroundColor: theme.colors.surface }]}>{mod.name}</Text>
            
            {mod.permissions.map((perm, j) => (
              <View key={perm.label} style={[
                styles.permissionRow, 
                { borderBottomColor: theme.colors.border },
                j === mod.permissions.length - 1 && i === modules.length - 1 && { borderBottomWidth: 0 }
              ]}>
                <View style={styles.permissionCol}>
                  <Text style={[styles.permissionLabel, { color: theme.colors.text }]}>{perm.label}</Text>
                </View>
                {rolesList.map(role => {
                  const roleKey = role.toLowerCase() as keyof typeof perm.roles;
                  return (
                    <View key={role} style={styles.roleCol}>
                      <Switch 
                        value={perm.roles[roleKey]} 
                        trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                        disabled={role === 'Admin'} // Admin has all by default
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        ))}
      </View>
      <View style={{height: 60}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    maxWidth: 900,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    marginBottom: 40,
  },
  matrixContainer: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    overflow: 'hidden',
  },
  matrixHeader: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    backgroundColor: '#fafafa',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moduleSection: {
    // marginBottom: 16,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  permissionCol: {
    flex: 2,
    justifyContent: 'center',
  },
  permissionLabel: {
    fontSize: 15,
  },
  roleCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
