import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../theme/theme';

export const DesktopHeader = ({ title, rightContent }: any) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
      <Text style={{ color: theme.colors.text, fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold as any }}>
        {title}
      </Text>
      <View>{rightContent}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, borderBottomWidth: 1 },
});
