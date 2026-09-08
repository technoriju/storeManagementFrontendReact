import { colors, darkColors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';
import { borderRadius, shadows } from './layout';
import { useColorScheme } from 'react-native';

export const lightTheme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  isDark: false,
};

export const darkTheme = {
  colors: darkColors,
  spacing,
  typography,
  borderRadius,
  shadows,
  isDark: true,
};

export type Theme = typeof lightTheme;

export const useTheme = (): Theme => {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkTheme : lightTheme;
};
