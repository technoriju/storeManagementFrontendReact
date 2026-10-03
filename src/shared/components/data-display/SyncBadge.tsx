import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SyncBadgeProps {
  status?: string;
}

export const SyncBadge: React.FC<SyncBadgeProps> = ({ status }) => {
  const isOnline = status === 'synced';
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isOnline ? '#DCFCE7' : '#FEF3C7' },
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: isOnline ? '#16A34A' : '#D97706' },
        ]}
      />
      <Text
        style={[
          styles.text,
          { color: isOnline ? '#16A34A' : '#D97706' },
        ]}
      >
        {isOnline ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});
