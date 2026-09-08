import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/theme';

export const MobileHeader = ({ title, onMenuPress, rightContent }: any) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
      <TouchableOpacity onPress={onMenuPress} style={{ padding: theme.spacing.sm }}>
        <Text style={{ color: theme.colors.text, fontSize: 24 }}>☰</Text>
      </TouchableOpacity>
      <Text style={{ flex: 1, textAlign: 'center', color: theme.colors.text, fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold as any }}>
        {title}
      </Text>
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>
        {rightContent}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1 },
});
