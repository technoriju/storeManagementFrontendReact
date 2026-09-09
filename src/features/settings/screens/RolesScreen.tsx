import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';

export const RolesScreen = () => {
  const theme = useTheme();

  const roles = [
    { id: '1', name: 'Super Admin', desc: 'Full access to all system features and settings.', usersCount: 1 },
    { id: '2', name: 'Manager', desc: 'Can manage inventory, view reports, and oversee cashiers.', usersCount: 3 },
    { id: '3', name: 'Cashier', desc: 'Access to Point of Sale and basic customer lookup.', usersCount: 8 },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Roles</Text>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.colors.border }]}>
          <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>Create new role</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Roles define what actions users can take.
      </Text>

      <View style={[styles.list, { borderTopColor: theme.colors.border }]}>
        {roles.map((role) => (
          <View key={role.id} style={[styles.roleItem, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.roleInfo}>
              <Text style={[styles.roleName, { color: theme.colors.text }]}>{role.name}</Text>
              <Text style={[styles.roleDesc, { color: theme.colors.textSecondary }]}>{role.desc}</Text>
            </View>
            <View style={styles.roleStats}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{role.usersCount}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                {role.usersCount === 1 ? 'user' : 'users'}
              </Text>
            </View>
            <TouchableOpacity style={styles.editBtn}>
              <Text style={[styles.editText, { color: theme.colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
        ))}
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
  actionBtn: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  description: {
    fontSize: 15,
    marginBottom: 40,
  },
  list: {
    borderTopWidth: 1,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
  },
  roleInfo: {
    flex: 1,
    paddingRight: 32,
  },
  roleName: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 6,
  },
  roleDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  roleStats: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
  },
  editBtn: {
    paddingLeft: 24,
  },
  editText: {
    fontSize: 15,
    fontWeight: '500',
  }
});
