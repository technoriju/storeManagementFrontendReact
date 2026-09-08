import React from 'react';
import { View, StyleSheet, TextInput, Text } from 'react-native';
import { useTheme } from '../../theme/theme';

export const AppInput = ({ label, error, ...props }: any) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, { marginBottom: theme.spacing.md }]}>
      {label && <Text style={{ color: theme.colors.text, marginBottom: theme.spacing.xs, fontWeight: theme.typography.weights.medium as any }}>{label}</Text>}
      <TextInput
        style={[
          styles.input, 
          { 
            backgroundColor: theme.colors.surface, 
            borderColor: error ? theme.colors.error : theme.colors.border, 
            borderRadius: theme.borderRadius.md,
            color: theme.colors.text
          }
        ]}
        placeholderTextColor={theme.colors.textSecondary}
        {...props}
      />
      {error && <Text style={{ color: theme.colors.error, fontSize: theme.typography.sizes.xs, marginTop: theme.spacing.xs }}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  input: { borderWidth: 1, height: 48, paddingHorizontal: 16 },
});
