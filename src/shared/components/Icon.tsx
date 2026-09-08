import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
// In a real project, this would import from react-native-vector-icons or similar
// import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/theme';

export type IconName = 
  | 'home'
  | 'settings'
  | 'user'
  | 'search'
  | 'chevron-right'
  | 'chevron-left';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 24, 
  color,
  style 
}) => {
  const theme = useTheme();
  const iconColor = color || theme.colors.text;

  // Placeholder for actual icon implementation
  return (
    <View style={[
      styles.placeholder, 
      { width: size, height: size, backgroundColor: iconColor },
      style
    ]} />
  );
};

const styles = StyleSheet.create({
  placeholder: {
    borderRadius: 4,
    opacity: 0.5,
  }
});
