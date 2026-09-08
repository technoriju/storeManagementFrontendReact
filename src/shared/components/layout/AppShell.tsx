import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { DesktopHeader } from './DesktopHeader';
import { MobileHeader } from './MobileHeader';
import { Sidebar } from './Sidebar';
import { AppDrawer } from '../feedback/AppDrawer';

const TABS = [
  { id: 'dashboard', label: 'Home', icon: 'home' },
  { id: 'pos', label: 'POS', icon: 'cart' },
  { id: 'products', label: 'Products', icon: 'cube' },
  { id: 'inventory', label: 'Inventory', icon: 'list' },
  { id: 'more', label: 'More', icon: 'menu' },
];

export const BottomNav = ({ activeTab, onTabChange }: any) => {
  const theme = useTheme();

  return (
    <View style={[styles.bottomNav, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
      {TABS.map(tab => (
        <TouchableOpacity
          key={tab.id}
          style={styles.bottomNavTab}
          onPress={() => onTabChange(tab.id)}
        >
          <Text style={{
            color: activeTab === tab.id ? theme.colors.primary : theme.colors.textSecondary,
            fontWeight: activeTab === tab.id ? 'bold' : 'normal',
            fontSize: 12,
          }}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export const AppShell = ({ children, activeTab = 'dashboard', onTabChange = () => {} }: any) => {
  const theme = useTheme();
  const { isDesktop, isTablet } = useResponsive();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isLargeScreen = isDesktop || isTablet;

  const handleMenuPress = () => setDrawerOpen(true);

  const currentTabLabel = TABS.find(t => t.id === activeTab)?.label || 'Dashboard';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {isLargeScreen ? (
        <DesktopHeader title={currentTabLabel} />
      ) : (
        <MobileHeader title={currentTabLabel} onMenuPress={handleMenuPress} />
      )}
      
      <View style={styles.body}>
        {isLargeScreen && (
          <Sidebar activeItem={activeTab} onItemPress={onTabChange} />
        )}
        
        <View style={styles.content}>
          {children}
        </View>
      </View>

      {!isLargeScreen && (
        <BottomNav activeTab={activeTab} onTabChange={(tab: string) => {
          if (tab === 'more') {
            setDrawerOpen(true);
          } else {
            onTabChange(tab);
          }
        }} />
      )}

      {!isLargeScreen && (
        <AppDrawer
          visible={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          <Sidebar activeItem={activeTab} onItemPress={(item: string) => {
            onTabChange(item);
            setDrawerOpen(false);
          }} isDrawer />
        </AppDrawer>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, flexDirection: 'row' },
  content: { flex: 1, overflow: 'hidden' },
  bottomNav: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    paddingBottom: 5, // Safe area for iPhone if needed
  },
  bottomNavTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
