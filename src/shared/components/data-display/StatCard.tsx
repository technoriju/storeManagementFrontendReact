import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../theme/theme';

export const StatCard = ({ title, value, icon, trend }: any) => {
  const theme = useTheme();
  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.colors.surface, 
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.sm
      }
    ]}>
      <View style={styles.header}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.medium as any }}>
          {title}
        </Text>
        {icon}
      </View>
      <Text style={{ color: theme.colors.text, fontSize: theme.typography.sizes.xxxl, fontWeight: theme.typography.weights.bold as any, marginTop: theme.spacing.sm }}>
        {value}
      </Text>
      {trend && (
        <Text style={{ color: trend > 0 ? theme.colors.success : theme.colors.error, fontSize: theme.typography.sizes.xs, marginTop: theme.spacing.xs }}>
          {trend > 0 ? '+' : ''}{trend}% from last month
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, minWidth: 200 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
