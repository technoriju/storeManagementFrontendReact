import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/theme';
import { Check } from 'lucide-react-native';

interface AppCheckboxProps {
  label?: string;
  checked: boolean;
  onPress: () => void;
}

export const AppCheckbox: React.FC<AppCheckboxProps> = ({ label, checked, onPress }) => {
  const theme = useTheme();

  return (
    <TouchableOpacity style={styles.checkboxBtn} onPress={onPress}>
      <View style={[styles.checkboxBox, { 
        borderColor: checked ? theme.colors.primary : theme.colors.border,
        backgroundColor: checked ? theme.colors.primary : 'transparent'
      }]}>
        {checked && <Check size={14} color="white" />}
      </View>
      {label && (
        <Text style={[styles.checkboxLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  checkboxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
  },
});
