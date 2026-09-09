import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';

export const GstSettingsScreen = () => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>GST Configuration</Text>
      </View>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Manage your GST rates, HSN codes, and tax rules. (Coming soon)
      </Text>
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
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
  },
});
