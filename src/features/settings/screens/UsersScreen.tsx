import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';

export const UsersScreen = () => {
  const theme = useTheme();

  // Mock data for phase 14
  const users = [
    { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'Super Admin', status: 'Active' },
    { id: '2', name: 'Store Manager', email: 'manager@example.com', role: 'Manager', status: 'Active' },
    { id: '3', name: 'Cashier 1', email: 'cashier1@example.com', role: 'Cashier', status: 'Inactive' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Users</Text>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.addButtonText}>Add User</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Manage team members and their roles within the system.
      </Text>

      <View style={[styles.listContainer, { borderColor: theme.colors.border }]}>
        <View style={[styles.listHeader, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.colName, { color: theme.colors.textSecondary }]}>Name</Text>
          <Text style={[styles.colRole, { color: theme.colors.textSecondary }]}>Role</Text>
          <Text style={[styles.colStatus, { color: theme.colors.textSecondary }]}>Status</Text>
        </View>
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.colName}>
                <Text style={[styles.userName, { color: theme.colors.text }]}>{item.name}</Text>
                <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>{item.email}</Text>
              </View>
              <View style={styles.colRole}>
                <Text style={[styles.roleText, { color: theme.colors.text }]}>{item.role}</Text>
              </View>
              <View style={styles.colStatus}>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: item.status === 'Active' ? theme.colors.success + '20' : theme.colors.error + '20' }
                ]}>
                  <Text style={[
                    styles.statusText, 
                    { color: item.status === 'Active' ? theme.colors.success : theme.colors.error }
                  ]}>{item.status}</Text>
                </View>
              </View>
            </View>
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    maxWidth: 900,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    marginBottom: 32,
  },
  addButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  listContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  colName: { flex: 2 },
  colRole: { flex: 1 },
  colStatus: { flex: 1, alignItems: 'flex-start' },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
  },
  roleText: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  }
});
