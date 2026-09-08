import React from 'react';
import { View, StyleSheet, Text, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useResponsive } from '../../hooks/useResponsive';

export const AppDialog = ({ visible, title, children, onClose, actions }: any) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  return (
    <Modal visible={visible} transparent animationType={isMobile ? "slide" : "fade"}>
      <View style={[
        styles.overlay, 
        { backgroundColor: 'rgba(0,0,0,0.5)' },
        isMobile ? styles.mobileOverlay : styles.desktopOverlay
      ]}>
        <View style={[
          styles.dialog, 
          { backgroundColor: theme.colors.surface },
          isMobile 
            ? { 
                borderTopLeftRadius: theme.borderRadius.lg, 
                borderTopRightRadius: theme.borderRadius.lg, 
                padding: theme.spacing.lg,
                paddingBottom: Math.max(theme.spacing.lg, 34) // safe area approx
              }
            : { 
                borderRadius: theme.borderRadius.lg, 
                padding: theme.spacing.lg 
              }
        ]}>
          <Text style={{ 
            color: theme.colors.text, 
            fontSize: theme.typography.sizes.xl, 
            fontWeight: theme.typography.weights.bold as any, 
            marginBottom: theme.spacing.md 
          }}>
            {title}
          </Text>
          <View style={{ marginBottom: theme.spacing.lg }}>{children}</View>
          <View style={[styles.actions, isMobile && styles.mobileActions]}>
            {actions}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  desktopOverlay: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  mobileOverlay: { justifyContent: 'flex-end', alignItems: 'center', padding: 0 },
  dialog: { width: '100%', maxWidth: 450 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  mobileActions: { flexDirection: 'column-reverse', gap: 12, alignItems: 'stretch' }
});
