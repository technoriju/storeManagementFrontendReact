import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../shared/theme/theme';
import { useResponsive } from '../../shared/hooks/useResponsive';
import { UsersListScreen } from './screens/UsersListScreen';
import { RolesListScreen } from './screens/RolesListScreen';
import { Users, Shield, Key } from 'lucide-react-native';
import { usePermissions } from '../../core/auth/usePermissions';

export interface UserManagementModuleProps {
  initialScreen?: string;
  onNavigateTab?: (tab: string) => void;
}

export const UserManagementModule: React.FC<UserManagementModuleProps> = ({
  initialScreen = 'users',
  onNavigateTab,
}) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const { can } = usePermissions();

  const [activeTab, setActiveTab] = useState<'users' | 'roles'>(
    initialScreen === 'roles_permissions' || initialScreen === 'roles' ? 'roles' : 'users'
  );

  useEffect(() => {
    if (initialScreen === 'roles_permissions' || initialScreen === 'roles') {
      setActiveTab('roles');
    } else {
      setActiveTab('users');
    }
  }, [initialScreen]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Sub Header Navigation Tabs */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.titleSection}>
          <Text style={[styles.moduleTitle, { color: theme.colors.text }]}>
            User & Access Management
          </Text>
          <Text style={[styles.moduleSubtitle, { color: theme.colors.textSecondary }]}>
            Control staff accounts, security privileges, and module access
          </Text>
        </View>

        <View style={[styles.tabsRow, isMobile && styles.tabsRowMobile]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'users' && [
                styles.tabBtnActive,
                { borderBottomColor: theme.colors.primary },
              ],
            ]}
            onPress={() => setActiveTab('users')}
          >
            <Users
              size={16}
              color={activeTab === 'users' ? theme.colors.primary : theme.colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color: activeTab === 'users' ? theme.colors.primary : theme.colors.textSecondary,
                  fontWeight: activeTab === 'users' ? '700' : '500',
                },
              ]}
            >
              Users
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'roles' && [
                styles.tabBtnActive,
                { borderBottomColor: theme.colors.primary },
              ],
            ]}
            onPress={() => setActiveTab('roles')}
          >
            <Key
              size={16}
              color={activeTab === 'roles' ? theme.colors.primary : theme.colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color: activeTab === 'roles' ? theme.colors.primary : theme.colors.textSecondary,
                  fontWeight: activeTab === 'roles' ? '700' : '500',
                },
              ]}
            >
              Roles & Permissions
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Content */}
      <View style={styles.content}>
        {activeTab === 'users' ? <UsersListScreen /> : <RolesListScreen />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
  },
  titleSection: {
    marginBottom: 12,
  },
  moduleTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  moduleSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  tabsRowMobile: {
    justifyContent: 'space-around',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
  },
  tabBtnText: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
});
