import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../theme/theme';
import { Icon } from '../Icon';

export interface DesktopHeaderProps {
  title?: string;
  rightContent?: React.ReactNode;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  title,
  rightContent,
  onToggleSidebar,
  isSidebarCollapsed = false,
}) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.leftContainer}>
        {onToggleSidebar && (
          <TouchableOpacity
            onPress={onToggleSidebar}
            style={[
              styles.toggleButton,
              {
                backgroundColor: isSidebarCollapsed
                  ? theme.colors.background
                  : 'transparent',
              },
            ]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            {...(Platform.OS === 'web'
              ? { title: isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar' }
              : {})}
          >
            <Icon name="menu" size={18} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        <Text
          style={[
            styles.brandTitle,
            {
              color: theme.colors.text,
            },
          ]}
        >
          Tarama Enterprise
        </Text>
        {title && (
          <View style={styles.breadcrumbContainer}>
            <Text style={[styles.breadcrumbDivider, { color: theme.colors.border }]}>/</Text>
            <Text style={[styles.pageTitle, { color: theme.colors.textSecondary }]}>
              {title}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.rightContainer}>{rightContent}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  breadcrumbDivider: {
    fontSize: 14,
    marginRight: 10,
  },
  pageTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
