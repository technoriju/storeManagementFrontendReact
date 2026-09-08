import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../theme/theme';

export const PageHeader = ({ title, subtitle, action }: any) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, { marginBottom: theme.spacing.lg }]}>
      <View>
        <Text style={{ color: theme.colors.text, fontSize: theme.typography.sizes.xxl, fontWeight: theme.typography.weights.bold as any }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm, marginTop: theme.spacing.xs }}>
            {subtitle}
          </Text>
        )}
      </View>
      <View>{action}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
