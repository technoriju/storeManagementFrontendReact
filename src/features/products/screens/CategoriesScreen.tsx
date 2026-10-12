import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { ProductScreenType } from '../ProductsModule';
import { CategoryListScreen } from '../../category/screens/CategoryListScreen';
import { ArrowLeft } from 'lucide-react-native';

interface Props {
  onNavigate: (screen: ProductScreenType) => void;
}

export const CategoriesScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.backBar, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('list')}>
          <ArrowLeft size={18} color={theme.colors.text} />
          <Text style={[styles.backText, { color: theme.colors.text }]}>Back to Products</Text>
        </TouchableOpacity>
      </View>
      <CategoryListScreen />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
});


