import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  AlertTriangle,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Info,
  Package,
  Wallet,
  Server,
  XCircle,
} from 'lucide-react-native';
import { useTheme } from '../../theme/theme';
import { useResponsive } from '../../hooks/useResponsive';

export type SweetAlertType = 'danger' | 'warning' | 'error' | 'success' | 'info';

export interface SideEffectItem {
  icon?: 'stock' | 'wallet' | 'server' | 'warning' | 'trash';
  title: string;
  description?: string;
}

export interface SweetConfirmModalProps {
  visible: boolean;
  type?: SweetAlertType;
  title: string;
  subtitle?: string;
  entityName?: string;
  sideEffects?: (string | SideEffectItem)[];
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const SweetConfirmModal: React.FC<SweetConfirmModalProps> = ({
  visible,
  type = 'danger',
  title,
  subtitle,
  entityName,
  sideEffects = [],
  confirmText = 'Yes, Delete',
  cancelText = 'Cancel',
  isConfirming = false,
  errorMessage = null,
  onConfirm,
  onClose,
}) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const isErrorView = !!errorMessage || type === 'error';
  const effectiveType = isErrorView ? 'error' : type;

  // Header Icon styling based on alert type
  const getIconConfig = () => {
    switch (effectiveType) {
      case 'danger':
        return {
          icon: <Trash2 size={36} color="#DC2626" />,
          bgColor: '#FEF2F2',
          borderColor: '#FEE2E2',
          ringColor: 'rgba(220, 38, 38, 0.12)',
          buttonColor: '#DC2626',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={36} color="#D97706" />,
          bgColor: '#FFFBEB',
          borderColor: '#FEF3C7',
          ringColor: 'rgba(217, 119, 6, 0.12)',
          buttonColor: '#D97706',
        };
      case 'error':
        return {
          icon: <XCircle size={36} color="#DC2626" />,
          bgColor: '#FEF2F2',
          borderColor: '#FEE2E2',
          ringColor: 'rgba(220, 38, 38, 0.12)',
          buttonColor: '#DC2626',
        };
      case 'success':
        return {
          icon: <CheckCircle2 size={36} color="#16A34A" />,
          bgColor: '#F0FDF4',
          borderColor: '#DCFCE7',
          ringColor: 'rgba(22, 163, 74, 0.12)',
          buttonColor: '#16A34A',
        };
      case 'info':
      default:
        return {
          icon: <Info size={36} color="#2563EB" />,
          bgColor: '#EFF6FF',
          borderColor: '#DBEAFE',
          ringColor: 'rgba(37, 99, 235, 0.12)',
          buttonColor: '#2563EB',
        };
    }
  };

  const iconConfig = getIconConfig();

  const renderSideEffectIcon = (iconName?: string) => {
    switch (iconName) {
      case 'stock':
        return <Package size={16} color="#D97706" />;
      case 'wallet':
        return <Wallet size={16} color="#DC2626" />;
      case 'server':
        return <Server size={16} color="#4F46E5" />;
      case 'trash':
        return <Trash2 size={16} color="#DC2626" />;
      case 'warning':
      default:
        return <AlertCircle size={16} color="#D97706" />;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.dialogContainer,
            {
              backgroundColor: theme.colors.surface || '#FFFFFF',
              borderColor: theme.colors.border || '#E5E7EB',
            },
            isMobile && styles.mobileContainer,
          ]}
        >
          {/* SweetAlert Centered Icon Badge */}
          <View style={styles.iconWrapper}>
            <View
              style={[
                styles.iconRing,
                {
                  backgroundColor: iconConfig.ringColor,
                },
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: iconConfig.bgColor,
                    borderColor: iconConfig.borderColor,
                  },
                ]}
              >
                {iconConfig.icon}
              </View>
            </View>
          </View>

          {/* Title & Description */}
          <Text style={[styles.title, { color: theme.colors.text || '#111827' }]}>
            {isErrorView ? 'Action Failed' : title}
          </Text>

          {entityName ? (
            <View style={styles.entityBadge}>
              <Text style={styles.entityBadgeText}>{entityName}</Text>
            </View>
          ) : null}

          <Text style={[styles.subtitle, { color: theme.colors.textSecondary || '#6B7280' }]}>
            {isErrorView ? errorMessage : subtitle}
          </Text>

          {/* Side Effects Section (Shown only in confirm mode, not in pure error modal) */}
          {!isErrorView && sideEffects.length > 0 && (
            <View style={styles.sideEffectsCard}>
              <View style={styles.sideEffectsHeader}>
                <AlertTriangle size={15} color="#B45309" />
                <Text style={styles.sideEffectsHeaderText}>Side Effects & Impact</Text>
              </View>

              <ScrollView style={styles.sideEffectsList} bounces={false}>
                {sideEffects.map((effect, idx) => {
                  const isString = typeof effect === 'string';
                  const titleText = isString ? effect : effect.title;
                  const descText = !isString ? effect.description : undefined;
                  const iconName = !isString ? effect.icon : undefined;

                  return (
                    <View key={idx} style={styles.effectItem}>
                      <View style={styles.effectIconWrapper}>
                        {renderSideEffectIcon(iconName)}
                      </View>
                      <View style={styles.effectContent}>
                        <Text style={styles.effectTitle}>{titleText}</Text>
                        {descText ? (
                          <Text style={styles.effectDesc}>{descText}</Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Action Buttons */}
          <View style={[styles.actionsRow, isMobile && styles.mobileActionsRow]}>
            {isErrorView ? (
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: '#DC2626', width: '100%' }]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>Dismiss</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    {
                      borderColor: theme.colors.border || '#D1D5DB',
                      backgroundColor: theme.colors.surface || '#FFFFFF',
                    },
                  ]}
                  onPress={onClose}
                  disabled={isConfirming}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary || '#4B5563' }]}>
                    {cancelText}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    { backgroundColor: iconConfig.buttonColor },
                    isConfirming && { opacity: 0.75 },
                  ]}
                  onPress={onConfirm}
                  disabled={isConfirming}
                  activeOpacity={0.8}
                >
                  {isConfirming ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmButtonText}>{confirmText}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  mobileContainer: {
    maxWidth: '100%',
    padding: 20,
  },
  iconWrapper: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  entityBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  entityBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  sideEffectsCard: {
    width: '100%',
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  sideEffectsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingBottom: 6,
  },
  sideEffectsHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sideEffectsList: {
    maxHeight: 140,
  },
  effectItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 4,
  },
  effectIconWrapper: {
    marginTop: 2,
  },
  effectContent: {
    flex: 1,
  },
  effectTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78350F',
    lineHeight: 18,
  },
  effectDesc: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 2,
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  mobileActionsRow: {
    flexDirection: 'column-reverse',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
