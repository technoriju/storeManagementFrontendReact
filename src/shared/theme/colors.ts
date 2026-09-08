export const colors = {
  primary: '#2697FF',
  primaryDark: '#1a75d2',
  primaryLight: '#73c2ff',
  secondary: '#2A2D3E',
  success: '#00C49F',
  warning: '#FFBB28',
  error: '#FF4560',
  info: '#0088FE',
  
  background: '#F3F4F6',
  surface: '#FFFFFF',
  
  text: '#1F2937',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
  
  border: '#E5E7EB',
  divider: '#E5E7EB',
  
  transparent: 'transparent',
};

export const darkColors: typeof colors = {
  ...colors,
  background: '#212332',
  surface: '#2A2D3E',
  
  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textDisabled: '#4B5563',
  
  border: '#374151',
  divider: '#374151',
};

export type ThemeColors = typeof colors;
