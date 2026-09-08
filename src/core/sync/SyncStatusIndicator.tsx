import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSyncStore } from './useSyncStore';
import { syncEngine } from './SyncEngine';
import { useTheme } from '../../shared/theme/theme';

export const SyncStatusIndicator = () => {
  const { status, pendingCount } = useSyncStore();
  const theme = useTheme();

  let text = '';
  let color = '';
  let indicatorColor = '';

  switch (status) {
    case 'synced':
      text = 'Synced';
      color = theme.colors.textSecondary;
      indicatorColor = '#4CAF50'; // Green
      break;
    case 'syncing':
      text = 'Syncing...';
      color = theme.colors.primary;
      indicatorColor = '#FFEB3B'; // Yellow
      break;
    case 'failed':
      text = 'Sync Failed';
      color = theme.colors.error;
      indicatorColor = '#F44336'; // Red
      break;
    case 'offline':
      text = 'Offline';
      color = theme.colors.textSecondary;
      indicatorColor = '#9E9E9E'; // Gray
      break;
    case 'pending':
      text = `Pending Changes (${pendingCount})`;
      color = theme.colors.primary;
      indicatorColor = '#2196F3'; // Blue
      break;
  }

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      onPress={() => syncEngine.syncNow()}
      disabled={status === 'syncing' || status === 'offline'}
    >
      <View style={[styles.dot, { backgroundColor: indicatorColor }]} />
      <Text style={[styles.text, { color }]}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});
