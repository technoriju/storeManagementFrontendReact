import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { useTheme } from '../../theme/theme';

export const SearchBar = ({ placeholder = 'Search...', value, onChangeText }: any) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md }]}>
      <TextInput
        style={[styles.input, { color: theme.colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { borderWidth: 1, paddingHorizontal: 12, height: 40, justifyContent: 'center' },
  input: { flex: 1, padding: 0 },
});
