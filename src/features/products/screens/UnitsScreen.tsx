import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { ProductScreenType } from '../ProductsModule';

interface Props {
  onNavigate: (screen: ProductScreenType) => void;
}

export const UnitsScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Units & Conversions</Text>
        <AppButton title="Back" onPress={() => onNavigate('list')} variant="outline" />
      </View>
      <View style={styles.content}>
        <Text style={{ color: theme.colors.textSecondary }}>Unit Conversions coming soon...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
