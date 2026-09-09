import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';

export const BranchesScreen = () => {
  const theme = useTheme();

  const branches = [
    { id: '1', name: 'Main Store', location: 'Downtown', manager: 'Alice Smith', status: 'Active' },
    { id: '2', name: 'North Branch', location: 'North Mall', manager: 'Bob Jones', status: 'Active' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Branches</Text>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.addButtonText}>Add Branch</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Manage your retail locations and store fronts.
      </Text>

      <View style={[styles.listContainer, { borderColor: theme.colors.border }]}>
        <View style={[styles.listHeader, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.colName, { color: theme.colors.textSecondary }]}>Branch Name</Text>
          <Text style={[styles.colLocation, { color: theme.colors.textSecondary }]}>Location</Text>
          <Text style={[styles.colManager, { color: theme.colors.textSecondary }]}>Manager</Text>
          <Text style={[styles.colStatus, { color: theme.colors.textSecondary }]}>Status</Text>
        </View>
        <FlatList
          data={branches}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.colName}>
                <Text style={[styles.branchName, { color: theme.colors.text }]}>{item.name}</Text>
              </View>
              <View style={styles.colLocation}>
                <Text style={[styles.cellText, { color: theme.colors.text }]}>{item.location}</Text>
              </View>
              <View style={styles.colManager}>
                <Text style={[styles.cellText, { color: theme.colors.text }]}>{item.manager}</Text>
              </View>
              <View style={styles.colStatus}>
                <Text style={[styles.statusText, { color: theme.colors.success }]}>{item.status}</Text>
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
  colLocation: { flex: 2 },
  colManager: { flex: 2 },
  colStatus: { flex: 1, alignItems: 'flex-start' },
  branchName: {
    fontSize: 15,
    fontWeight: '500',
  },
  cellText: {
    fontSize: 14,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  }
});
