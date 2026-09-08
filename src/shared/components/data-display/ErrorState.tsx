import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../theme/theme';

export const ErrorState = ({ message, retryAction }: any) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, { padding: theme.spacing.xl }]}>
      <Text style={{ color: theme.colors.error, fontSize: theme.typography.sizes.lg, marginBottom: theme.spacing.md }}>
        {message || 'Something went wrong'}
      </Text>
      {retryAction}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
