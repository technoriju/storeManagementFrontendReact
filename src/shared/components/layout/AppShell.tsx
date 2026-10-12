import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Text, TouchableOpacity, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { DesktopHeader } from './DesktopHeader';
import { MobileHeader } from './MobileHeader';
import { Sidebar } from './Sidebar';
import { AppDrawer } from '../feedback/AppDrawer';
import { SyncStatusIndicator } from '../../../core/sync/SyncStatusIndicator';
import { Icon, IconName } from '../Icon';

type TabItem = {
  id: string;
  label: string;
  icon: IconName;
};

const TABS: TabItem[] = [
  { id: 'dashboard', label: 'Home', icon: 'home' },
  { id: 'pos', label: 'POS', icon: 'cart' },
  { id: 'products', label: 'Products', icon: 'box' },
  { id: 'customers', label: 'Customers', icon: 'users' },
  { id: 'suppliers', label: 'Suppliers', icon: 'truck' },
  { id: 'inventory', label: 'Inventory', icon: 'layers' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
  { id: 'more', label: 'More', icon: 'menu' },
];

const isTabActive = (tabId: string, currentTab: string) => {
  if (tabId === currentTab) return true;
  if (tabId === 'dashboard' && currentTab === 'dashboard') return true;
  if (tabId === 'products' && (
    currentTab === 'products' || 
    currentTab === 'create_product' || 
    currentTab === 'expired_products' ||
    currentTab === 'category' || 
    currentTab === 'sub_category' || 
    currentTab === 'brands' || 
    currentTab === 'units' ||
    currentTab === 'sub_units' ||
    currentTab === 'variant_attributes' ||
    currentTab === 'warranties' ||
    currentTab === 'print_barcode' ||
    currentTab === 'print_qr_code'
  )) return true;
  if (tabId === 'pos' && (
    currentTab === 'pos' || 
    currentTab === 'sales' || 
    currentTab === 'invoices' || 
    currentTab === 'quotation' || 
    currentTab === 'sales_return'
  )) return true;
  if (tabId === 'customers' && (
    currentTab === 'customers' || 
    currentTab === 'customer_payment' || 
    currentTab === 'customer_payments'
  )) return true;
  if (tabId === 'suppliers' && (
    currentTab === 'suppliers' || 
    currentTab === 'supplier_payment' || 
    currentTab === 'supplier_payments'
  )) return true;
  if (tabId === 'inventory' && (
    currentTab === 'inventory' || 
    currentTab === 'manage_stock' || 
    currentTab === 'stock_adjustment' || 
    currentTab === 'stock_transfer' || 
    currentTab === 'low_stocks'
  )) return true;
  if (tabId === 'settings' && (
    currentTab === 'settings' || 
    currentTab.startsWith('settings_') || 
    currentTab === 'invoice_preview' || 
    currentTab === 'invoice' || 
    currentTab === 'business' || 
    currentTab === 'printers'
  )) return true;
  return false;
};

export const BottomNav = ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (id: string) => void }) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const scrollViewRef = useRef<any>(null);
  const TAB_WIDTH = 70;
  const isScrollable = width < TABS.length * TAB_WIDTH;

  useEffect(() => {
    if (isScrollable && scrollViewRef.current) {
      const activeIndex = TABS.findIndex(t => isTabActive(t.id, activeTab));
      if (activeIndex !== -1) {
        const targetX = Math.max(0, activeIndex * TAB_WIDTH - width / 2 + TAB_WIDTH / 2);
        scrollViewRef.current.scrollTo({ x: targetX, animated: true });
      }
    }
  }, [activeTab, width, isScrollable]);

  return (
    <View style={[styles.bottomNav, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.bottomNavScrollContent,
          !isScrollable && { flex: 1, justifyContent: 'space-around' }
        ]}
      >
        {TABS.map(tab => {
          const isActive = isTabActive(tab.id, activeTab);
          const activeColor = theme.colors.primary;
          const inactiveColor = theme.colors.textSecondary;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.bottomNavTab,
                !isScrollable && { flex: 1 },
                { width: isScrollable ? TAB_WIDTH : undefined }
              ]}
              onPress={() => onTabChange(tab.id)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconWrapper,
                isActive && { backgroundColor: activeColor + '18' }
              ]}>
                <Icon
                  name={tab.icon}
                  size={19}
                  color={isActive ? activeColor : inactiveColor}
                />
              </View>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? activeColor : inactiveColor,
                    fontWeight: isActive ? '700' : '500',
                  }
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export const AppShell = ({ children, activeTab = 'dashboard', onTabChange = () => {} }: any) => {
  const theme = useTheme();
  const { isDesktop, isTablet } = useResponsive();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isLargeScreen = isDesktop || isTablet;

  const handleMenuPress = () => setDrawerOpen(true);

  const formatTabTitle = (tab: string) => {
    const found = TABS.find(t => t.id === tab);
    if (found) return found.label;
    if (tab === 'profit_loss') return 'Profit & Loss';
    return tab.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const currentTabLabel = formatTabTitle(activeTab);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {isLargeScreen ? (
        <DesktopHeader title={currentTabLabel} rightContent={<SyncStatusIndicator />} />
      ) : (
        <MobileHeader title={currentTabLabel} onMenuPress={handleMenuPress} rightContent={<SyncStatusIndicator />} />
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
    height: 60,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 12 : 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 6,
  },
  bottomNavScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    minHeight: '100%',
    flexGrow: 1,
  },
  bottomNavTab: {
    minWidth: 64,
    flexShrink: 0,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  iconWrapper: {
    width: 36,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 13,
    textAlign: 'center',
  },
});


