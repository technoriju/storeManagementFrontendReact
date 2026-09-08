import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/theme';

export const FilterBar = ({ children }: any) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, { paddingVertical: theme.spacing.sm }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row' },
});
