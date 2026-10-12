import React from 'react';
import { View, StyleSheet, Text, Modal, TouchableOpacity, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { X } from 'lucide-react-native';

export const AppDialog = ({ visible, title, children, onClose, actions }: any) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  return (
    <Modal visible={visible} transparent animationType={isMobile ? "slide" : "fade"} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.keyboardView}
      >
        <Pressable 
          style={[
            styles.overlay, 
            { backgroundColor: 'rgba(0,0,0,0.5)' },
            isMobile ? styles.mobileOverlay : styles.desktopOverlay
          ]}
          onPress={onClose}
        >
          <Pressable 
            style={[
              styles.dialog, 
              { backgroundColor: theme.colors.surface },
              isMobile 
                ? { 
                    borderTopLeftRadius: theme.borderRadius.lg, 
                    borderTopRightRadius: theme.borderRadius.lg, 
                    padding: theme.spacing.lg,
                    paddingBottom: Math.max(theme.spacing.lg, 24),
                    maxHeight: '90%'
                  }
                : { 
                    borderRadius: theme.borderRadius.lg, 
                    padding: theme.spacing.lg,
                    maxHeight: '85%'
                  }
            ]}
            onPress={(e) => e?.stopPropagation?.()}
          >
            <View style={styles.dialogHeader}>
              <Text style={{ 
                color: theme.colors.text, 
                fontSize: theme.typography.sizes.xl, 
                fontWeight: theme.typography.weights.bold as any, 
                flex: 1
              }}>
                {title}
              </Text>
              {onClose && (
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
              {children}
            </ScrollView>
            <View style={[styles.actions, isMobile && styles.mobileActions]}>
              {actions}
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  overlay: { flex: 1 },
  desktopOverlay: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  mobileOverlay: { justifyContent: 'flex-end', alignItems: 'center', padding: 0 },
  dialog: { width: '100%', maxWidth: 450 },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 4,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  mobileActions: { flexDirection: 'column-reverse', gap: 10, alignItems: 'stretch', marginTop: 16 }
});


