import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/theme';

export const AppSelect = ({ label, value, placeholder, onPress, error }: any) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, { marginBottom: theme.spacing.md }]}>
      {label && <Text style={{ color: theme.colors.text, marginBottom: theme.spacing.xs, fontWeight: theme.typography.weights.medium as any }}>{label}</Text>}
      <TouchableOpacity
        style={[
          styles.input, 
          { 
            backgroundColor: theme.colors.surface, 
            borderColor: error ? theme.colors.error : theme.colors.border, 
            borderRadius: theme.borderRadius.md,
          }
        ]}
        onPress={onPress}
      >
        <Text style={{ color: value ? theme.colors.text : theme.colors.textSecondary }}>
          {value || placeholder || 'Select...'}
        </Text>
      </TouchableOpacity>
      {error && <Text style={{ color: theme.colors.error, fontSize: theme.typography.sizes.xs, marginTop: theme.spacing.xs }}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  input: { borderWidth: 1, height: 48, paddingHorizontal: 16, justifyContent: 'center' },
});
