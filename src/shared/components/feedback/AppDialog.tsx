import React from 'react';
import { View, StyleSheet, Text, Modal, TouchableOpacity, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { X } from 'lucide-react-native';

export interface AppDialogProps {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  actions?: React.ReactNode;
  maxWidth?: number | string;
  compact?: boolean;
  style?: any;
}

export const AppDialog = ({ 
  visible, 
  title, 
  children, 
  onClose, 
  actions,
  maxWidth,
  compact = false,
  style
}: AppDialogProps) => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();

  const resolvedMaxWidth = maxWidth 
    ? (typeof maxWidth === 'number' && isMobile ? Math.min(maxWidth, windowWidth - 16) : maxWidth)
    : (isMobile ? '100%' : 460);

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
              { 
                backgroundColor: theme.colors.surface,
                maxWidth: resolvedMaxWidth,
              },
              isMobile 
                ? { 
                    borderTopLeftRadius: theme.borderRadius.lg, 
                    borderTopRightRadius: theme.borderRadius.lg, 
                    paddingHorizontal: compact ? 12 : 14,
                    paddingTop: compact ? 10 : 12,
                    paddingBottom: Math.max(compact ? 12 : 16, 20),
                    maxHeight: '92%'
                  }
                : { 
                    borderRadius: theme.borderRadius.lg, 
                    paddingHorizontal: compact ? 16 : 18,
                    paddingTop: compact ? 12 : 14,
                    paddingBottom: compact ? 14 : 16,
                    maxHeight: '88%'
                  },
              style
            ]}
            onPress={(e) => e?.stopPropagation?.()}
          >
            <View style={[
              styles.dialogHeader,
              compact && styles.compactHeader,
              { borderBottomColor: theme.colors.divider }
            ]}>
              <Text 
                numberOfLines={1}
                style={{ 
                  color: theme.colors.text, 
                  fontSize: compact ? 16 : (isMobile ? 16 : 18), 
                  fontWeight: '700', 
                  flex: 1
                }}
              >
                {title}
              </Text>
              {onClose && (
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={17} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false} 
              style={styles.dialogBody}
              contentContainerStyle={{ paddingVertical: 6, flexGrow: 1 }}
            >
              {children}
            </ScrollView>

            {actions && (
              <View style={[
                styles.actions, 
                compact && styles.compactActions,
                isMobile && styles.mobileActions,
                { borderTopColor: theme.colors.divider }
              ]}>
                {actions}
              </View>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  overlay: { flex: 1 },
  desktopOverlay: { justifyContent: 'center', alignItems: 'center', padding: 16 },
  mobileOverlay: { justifyContent: 'flex-end', alignItems: 'center', padding: 0 },
  dialog: { width: '100%', display: 'flex', flexDirection: 'column' },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  compactHeader: {
    paddingBottom: 8,
    marginBottom: 6,
  },
  closeBtn: {
    padding: 3,
    borderRadius: 4,
  },
  dialogBody: {
    flexShrink: 1,
  },
  actions: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    gap: 10, 
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
  },
  compactActions: {
    paddingTop: 8,
    marginTop: 4,
    gap: 8,
  },
  mobileActions: { 
    flexDirection: 'row', 
    gap: 8, 
    alignItems: 'center',
    justifyContent: 'flex-end',
  }
});


