export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
  },
  weights: {
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
  },
  fonts: {
    primary: 'System',
    // Fallbacks for different platforms can be configured here
  },
};

export type ThemeTypography = typeof typography;
