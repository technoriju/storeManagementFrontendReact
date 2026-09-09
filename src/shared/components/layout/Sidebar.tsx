import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Animated, useWindowDimensions } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAuthStore } from '../../../core/auth/auth.store';
import { Icon, IconName } from '../Icon';

// Types
type SubItem = {
  id: string;
  label: string;
};

type MenuItem = {
  id: string;
  label: string;
  icon: IconName;
  subItems?: SubItem[];
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

// Data based on the screenshot
const menuSections: MenuSection[] = [
  {
    title: 'Stock',
    items: [
      { id: 'inventory', label: 'Manage Stock', icon: 'layers' },
      { id: 'stock_adj', label: 'Stock Adjustment', icon: 'git-merge' },
      { id: 'stock_trans', label: 'Stock Transfer', icon: 'send' },
    ]
  },
  {
    title: 'Sales',
    items: [
      { 
        id: 'sales_group', 
        label: 'Sales', 
        icon: 'grid', 
        subItems: [
          { id: 'online_orders', label: 'Online Orders' },
          { id: 'pos_orders', label: 'POS Orders' },
        ]
      },
      { id: 'invoices', label: 'Invoices', icon: 'file-text' },
      { id: 'sales_return', label: 'Sales Return', icon: 'corner-down-left' },
      { id: 'quotation', label: 'Quotation', icon: 'file' },
      { id: 'pos', label: 'POS', icon: 'monitor' },
    ]
  },
  {
    title: 'Promo',
    items: [
      { id: 'coupons', label: 'Coupons', icon: 'tag' },
      { id: 'gift_cards', label: 'Gift Cards', icon: 'gift' },
      { id: 'discount', label: 'Discount', icon: 'percent' },
    ]
  },
  {
    title: 'Purchases',
    items: [
      { id: 'purchases', label: 'Purchases', icon: 'cart' },
    ]
  },
  {
    title: 'Other',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'home' },
      { id: 'products', label: 'Products', icon: 'cube' },
      { id: 'reports', label: 'Reports', icon: 'file-text' },
      { id: 'settings', label: 'Settings', icon: 'settings' },
    ]
  }
];

const CUSTOM_COLORS = {
  activeBg: '#FFF4EC',
  activeText: '#F89344',
  headerText: '#1A2F5C',
  iconInactive: '#7B809A',
};

const MenuItemComponent = ({ item, activeItem, onItemPress, theme }: { item: MenuItem, activeItem: string, onItemPress: (id: string) => void, theme: any }) => {
  const hasSubItems = item.subItems && item.subItems.length > 0;
  // Check if this item is active, or if any of its subitems is active
  const isDirectActive = activeItem === item.id;
  const isSubActive = hasSubItems && item.subItems!.some(sub => sub.id === activeItem);
  const isActiveGroup = isDirectActive || isSubActive;
  
  const [expanded, setExpanded] = useState(isActiveGroup);
  
  // Animation for smooth sub-heading transition
  const animatedHeight = useRef(new Animated.Value(expanded ? (item.subItems?.length || 0) * 44 : 0)).current;
  const animatedRotate = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    if (isActiveGroup && !expanded) {
      setExpanded(true);
      Animated.parallel([
        Animated.timing(animatedHeight, {
          toValue: (item.subItems?.length || 0) * 44,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(animatedRotate, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isActiveGroup, expanded, item.subItems, animatedHeight, animatedRotate]);

  const toggleExpand = () => {
    const toValue = expanded ? 0 : 1;
    const targetHeight = expanded ? 0 : (item.subItems?.length || 0) * 44;
    
    setExpanded(!expanded);
    
    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue: targetHeight,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(animatedRotate, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePress = () => {
    if (hasSubItems) {
      toggleExpand();
    } else {
      onItemPress(item.id);
    }
  };

  const spin = animatedRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg']
  });

  return (
    <View style={styles.menuItemContainer}>
      <TouchableOpacity
        style={[
          styles.item,
          isActiveGroup && styles.itemActive
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          <Icon 
            name={item.icon} 
            size={16} 
            color={isActiveGroup ? CUSTOM_COLORS.activeText : CUSTOM_COLORS.iconInactive}
            style={{ marginRight: 12 }}
          />
          <Text style={[
            styles.itemText,
            { color: isActiveGroup ? CUSTOM_COLORS.activeText : theme.colors.textSecondary },
            isActiveGroup && styles.itemTextActive
          ]}>
            {item.label}
          </Text>
        </View>
        
        {hasSubItems && (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Icon 
              name="chevron-right" 
              size={14} 
              color={isActiveGroup ? CUSTOM_COLORS.activeText : '#CBD5E1'} 
            />
          </Animated.View>
        )}
      </TouchableOpacity>

      {hasSubItems && (
        <Animated.View style={{ height: animatedHeight, overflow: 'hidden' }}>
          {item.subItems!.map((subItem) => {
            const isSubItemActive = activeItem === subItem.id;
            return (
              <TouchableOpacity
                key={subItem.id}
                style={styles.subItem}
                onPress={() => onItemPress(subItem.id)}
              >
                <View style={[
                  styles.subItemDot, 
                  { backgroundColor: isSubItemActive ? CUSTOM_COLORS.activeText : '#CBD5E1' }
                ]} />
                <Text style={[
                  styles.subItemText,
                  { color: isSubItemActive ? CUSTOM_COLORS.activeText : theme.colors.textSecondary },
                  isSubItemActive && styles.subItemTextActive
                ]}>
                  {subItem.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      )}
    </View>
  );
};

export const Sidebar = ({ activeItem, onItemPress, isDrawer }: any) => {
  const theme = useTheme();
  const { logout } = useAuthStore();
  const { width } = useWindowDimensions();
  
  const isMobile = width < 768;

  return (
    <View style={[
      styles.container, 
      { backgroundColor: theme.colors.surface, borderRightColor: theme.colors.border },
      isDrawer && styles.drawerContainer,
      isMobile && !isDrawer && { display: 'none' }
    ]}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.paddingContainer}>
          {menuSections.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={styles.sectionTitle}>
                {section.title}
              </Text>
              
              {section.items.map((item) => (
                <MenuItemComponent
                  key={item.id}
                  item={item}
                  activeItem={activeItem}
                  onItemPress={onItemPress}
                  theme={theme}
                />
              ))}
              
              {index < menuSections.length - 1 && (
                <View style={styles.divider} />
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.item}
          onPress={logout}
        >
          <Icon name="log-out" size={16} color={theme.colors.error} style={{ marginRight: 12 }} />
          <Text style={{ 
            color: theme.colors.error,
            fontWeight: theme.typography.weights.medium as any,
            fontSize: 14
          }}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    width: 250, 
    borderRightWidth: 1, 
    height: '100%', 
    flexDirection: 'column' 
  },
  drawerContainer: { 
    width: '100%', 
    borderRightWidth: 0 
  },
  paddingContainer: {
    paddingVertical: 16,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    color: CUSTOM_COLORS.headerText,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  },
  menuItemContainer: {
    marginBottom: 4,
  },
  item: { 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    borderRadius: 8,
  },
  itemActive: {
    backgroundColor: CUSTOM_COLORS.activeBg,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemTextActive: {
    fontWeight: '600',
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 48,
    paddingRight: 20,
    height: 44,
  },
  subItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
  },
  subItemText: {
    fontSize: 14,
    fontWeight: '400',
  },
  subItemTextActive: {
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 16,
    paddingHorizontal: 20,
  }
});
