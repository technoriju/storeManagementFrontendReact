import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import { useTheme } from '../../theme/theme';

export const FormGrid = ({ children }: any) => {
  const { isMobile } = useResponsive();
  const theme = useTheme();

  return (
    <View style={[styles.container, isMobile ? styles.mobile : styles.desktop, { gap: theme.spacing.md }]}>
      {React.Children.map(children, (child) => (
        <View style={isMobile ? styles.fullWidth : styles.halfWidth}>
          {child}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  desktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mobile: {
    flexDirection: 'column',
  },
  halfWidth: {
    width: '48%',
  },
  fullWidth: {
    width: '100%',
  }
});
