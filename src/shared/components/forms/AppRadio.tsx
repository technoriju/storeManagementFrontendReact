import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/theme';

interface AppRadioProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export const AppRadio: React.FC<AppRadioProps> = ({ label, selected, onPress }) => {
  const theme = useTheme();

  return (
    <TouchableOpacity style={styles.radioBtn} onPress={onPress}>
      <View style={[styles.radioCircle, { borderColor: selected ? theme.colors.primary : theme.colors.border }]}>
        {selected && <View style={[styles.radioInner, { backgroundColor: theme.colors.primary }]} />}
      </View>
      <Text style={[styles.radioLabel, { color: selected ? theme.colors.text : theme.colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  radioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  radioLabel: {
    fontSize: 14,
  },
});
