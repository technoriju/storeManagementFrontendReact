import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../theme/theme';

export const EmptyState = ({ title, description, action }: any) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, { padding: theme.spacing.xl }]}>
      <Text style={{ color: theme.colors.text, fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold as any, marginBottom: theme.spacing.sm }}>
        {title}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.lg }}>
        {description}
      </Text>
      {action}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
