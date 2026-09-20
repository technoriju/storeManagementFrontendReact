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
  hasChevron?: boolean;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

// Data based on the screenshot
const menuSections: MenuSection[] = [
  {
    title: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'grid', hasChevron: false },
      // { id: 'super_admin', label: 'Super Admin', icon: 'user', hasChevron: true },
      // { id: 'application', label: 'Application', icon: 'layers', hasChevron: true },
      // { id: 'layouts', label: 'Layouts', icon: 'layout', hasChevron: true },
    ]
  },
  {
    title: 'Inventory',
    items: [
      { id: 'products', label: 'Products', icon: 'box' },
      { id: 'create_product', label: 'Create Product', icon: 'plus-square' },
      { id: 'expired_products', label: 'Expired Products', icon: 'alert-circle' },
      { id: 'low_stocks', label: 'Low Stocks', icon: 'trending-down' },
      { id: 'category', label: 'Category', icon: 'list' },
      { id: 'sub_category', label: 'Sub Category', icon: 'columns' },
      { id: 'brands', label: 'Brands', icon: 'triangle' },
      { id: 'units', label: 'Units', icon: 'box' },
      { id: 'variant_attributes', label: 'Variant Attributes', icon: 'file-text' },
      { id: 'warranties', label: 'Warranties', icon: 'award' },
      { id: 'print_barcode', label: 'Print Barcode', icon: 'maximize' },
      { id: 'print_qr_code', label: 'Print QR Code', icon: 'grid' },
    ]
  },
  {
    title: 'Stock',
    items: [
      { id: 'manage_stock', label: 'Manage Stock', icon: 'layers' },
      { id: 'stock_adjustment', label: 'Stock Adjustment', icon: 'git-merge' },
      { id: 'stock_transfer', label: 'Stock Transfer', icon: 'upload' },
    ]
  },
  {
    title: 'Sales',
    items: [
      { id: 'pos', label: 'Sales', icon: 'monitor' },     
      { id: 'invoices', label: 'Invoices', icon: 'file-text' },
      { id: 'sales_return', label: 'Sales Return', icon: 'corner-down-left' },
      { id: 'quotation', label: 'Quotation', icon: 'file' }      
    ]
  },
  {
    title: 'Purchases',
    items: [
      { id: 'purchases', label: 'Purchases', icon: 'shopping-bag' },
      { id: 'purchase_order', label: 'Purchase Order', icon: 'file-text' },
      { id: 'purchase_return', label: 'Purchase Return', icon: 'corner-up-left' },
    ]
  },
  {
    title: 'Finance & Accounts',
    items: [
      { 
        id: 'expenses', 
        label: 'Expenses', 
        icon: 'file-minus', 
        hasChevron: true,
        subItems: [
          { id: 'expense_list', label: 'Expenses' },
          { id: 'expense_category', label: 'Expense Category' }
        ]
      },
      { 
        id: 'income', 
        label: 'Income', 
        icon: 'file-plus', 
        hasChevron: true,
        subItems: [
          { id: 'income_list', label: 'Income' },
          { id: 'income_category', label: 'Income Category' }
        ]
      },
      { id: 'bank_accounts', label: 'Bank Accounts', icon: 'briefcase' },
      { id: 'money_transfer', label: 'Money Transfer', icon: 'refresh-cw' },
      { id: 'balance_sheet', label: 'Balance Sheet', icon: 'file-text' },
      { id: 'trial_balance', label: 'Trial Balance', icon: 'alert-circle' },
      { id: 'cash_flow', label: 'Cash Flow', icon: 'dollar-sign' },
      { id: 'account_statement', label: 'Account Statement', icon: 'file' },
    ]
  },
  {
    title: 'Peoples',
    items: [
      { id: 'customers', label: 'Customers', icon: 'users' },
      { id: 'suppliers', label: 'Suppliers', icon: 'user' },
      { id: 'stores', label: 'Stores', icon: 'home' },
      { id: 'warehouses', label: 'Warehouses', icon: 'archive' },
    ]
  },
  {
    title: 'HRM',
    items: [
      { id: 'employees', label: 'Employees', icon: 'user' },
      { id: 'departments', label: 'Departments', icon: 'pie-chart' },
      { id: 'designation', label: 'Designation', icon: 'share-2' },
      { id: 'shifts', label: 'Shifts', icon: 'shuffle' },
      { id: 'attendance', label: 'Attendance', icon: 'user-check', hasChevron: true },
      { id: 'leaves', label: 'Leaves', icon: 'calendar', hasChevron: true },
      { id: 'holidays', label: 'Holidays', icon: 'calendar' },
      { id: 'payroll', label: 'Payroll', icon: 'dollar-sign', hasChevron: true },
    ]
  },
  {
    title: 'Reports',
    items: [
      { id: 'sales_report', label: 'Sales Report', icon: 'bar-chart-2', hasChevron: true },
      { id: 'purchase_report', label: 'Purchase report', icon: 'clock' },
      { id: 'inventory_report', label: 'Inventory Report', icon: 'filter', hasChevron: true },
      { id: 'invoice_report', label: 'Invoice Report', icon: 'dollar-sign' },
      { id: 'supplier_report', label: 'Supplier Report', icon: 'users', hasChevron: true },
      { id: 'customer_report', label: 'Customer Report', icon: 'clipboard', hasChevron: true },
      { id: 'product_report', label: 'Product Report', icon: 'box', hasChevron: true },
      { id: 'expense_report', label: 'Expense Report', icon: 'file-text' },
      { id: 'income_report', label: 'Income Report', icon: 'file' },
      { id: 'tax_report', label: 'Tax Report', icon: 'activity' },
      { id: 'profit_loss', label: 'Profit & Loss', icon: 'pie-chart' },
      { id: 'annual_report', label: 'Annual Report', icon: 'calendar' },
    ]
  },
  {
    title: 'User Management',
    items: [
      { id: 'users', label: 'Users', icon: 'shield' },
      { id: 'roles_permissions', label: 'Roles & Permissions', icon: 'key' },
      { id: 'delete_account_request', label: 'Delete Account Request', icon: 'trash-2' },
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
  const hasChevron = item.hasChevron || hasSubItems;
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
            size={18} 
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
        
        {hasChevron && (
          <Animated.View style={{ transform: [{ rotate: hasSubItems ? spin : '0deg' }] }}>
            <View style={[
              styles.chevronContainer,
              isActiveGroup && { backgroundColor: '#FFE4CC' }
            ]}>
              <Icon 
                name="chevron-right" 
                size={12} 
                color={isActiveGroup ? CUSTOM_COLORS.activeText : "#64748B"} 
              />
            </View>
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
    marginTop: 4,
  },
  menuItemContainer: {
    marginBottom: 4,
  },
  item: { 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
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
  chevronContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 2,
    marginHorizontal: 20,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 16,
    paddingHorizontal: 20,
  }
});
