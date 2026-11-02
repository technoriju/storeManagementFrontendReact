import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Animated, useWindowDimensions, Platform } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAuthStore } from '../../../core/auth/auth.store';
import { usePermissions, hasPermission } from '../../../core/auth/usePermissions';
import { Icon, IconName } from '../Icon';

// Types
type SubItem = {
  id: string;
  label: string;
  permission?: string;
};

type MenuItem = {
  id: string;
  label: string;
  icon: IconName;
  permission?: string;
  subItems?: SubItem[];
  hasChevron?: boolean;
};

type MenuSection = {
  title: string;
  permission?: string;
  items: MenuItem[];
};

// Data based on the screenshot
const menuSections: MenuSection[] = [
  {
    title: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'grid', permission: 'dashboard:view', hasChevron: false },
    ]
  },
  {
    title: 'Inventory',
    items: [
      { id: 'products', label: 'Products', icon: 'box', permission: 'inventory:view' },
      { id: 'add_product', label: 'Add Product', icon: 'plus-square', permission: 'products:create' },
      { id: 'expired_products', label: 'Expired Products', icon: 'alert-circle', permission: 'inventory:view' },
      { id: 'low_stocks', label: 'Low Stocks', icon: 'trending-down', permission: 'inventory:view' },
      { id: 'category', label: 'Category', icon: 'list', permission: 'inventory:view' },
      { id: 'sub_category', label: 'Sub Category', icon: 'columns', permission: 'inventory:view' },
      { id: 'brands', label: 'Brands', icon: 'triangle', permission: 'inventory:view' },
      { id: 'units', label: 'Units', icon: 'box', permission: 'inventory:view' },
      { id: 'sub_units', label: 'Sub Units', icon: 'copy', permission: 'inventory:view' },
      { id: 'variant_attributes', label: 'Variant Attributes', icon: 'file-text', permission: 'inventory:view' },
      { id: 'warranties', label: 'Warranties', icon: 'award', permission: 'inventory:view' },
      { id: 'print_barcode', label: 'Print Barcode', icon: 'maximize', permission: 'barcode:print' },
      { id: 'print_qr_code', label: 'Print QR Code', icon: 'grid', permission: 'barcode:print' },
    ]
  },
  {
    title: 'Stock',
    items: [
      { id: 'manage_stock', label: 'Manage Stock', icon: 'layers', permission: 'stock:manage' },
      { id: 'stock_adjustment', label: 'Stock Adjustment', icon: 'git-merge', permission: 'stock:adjustment' },
      { id: 'stock_transfer', label: 'Stock Transfer', icon: 'upload', permission: 'stock:transfer' },
    ]
  },
  {
    title: 'Sales',
    items: [
      { id: 'pos', label: 'Sales', icon: 'monitor', permission: 'pos:create' },     
      { id: 'invoices', label: 'Invoices', icon: 'file-text', permission: 'invoices:view' },
      { id: 'sales_return', label: 'Sales Return', icon: 'corner-down-left', permission: 'sales:return' },
      { id: 'quotation', label: 'Quotation', icon: 'file', permission: 'quotations:view' }      
    ]
  },
  {
    title: 'Purchases',
    items: [
      { id: 'purchases', label: 'Purchases', icon: 'shopping-bag', permission: 'purchases:view' },
      { id: 'purchase_order', label: 'Purchase Order', icon: 'file-text', permission: 'purchase_orders:manage' },
      { id: 'purchase_return', label: 'Purchase Return', icon: 'corner-up-left', permission: 'purchases:return' },
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
        permission: 'expenses:manage',
        subItems: [
          { id: 'expense_list', label: 'Expenses', permission: 'expenses:manage' },
          { id: 'expense_category', label: 'Expense Category', permission: 'expenses:manage' }
        ]
      },
      { 
        id: 'income', 
        label: 'Income', 
        icon: 'file-plus', 
        hasChevron: true,
        permission: 'income:manage',
        subItems: [
          { id: 'income_list', label: 'Income', permission: 'income:manage' },
          { id: 'income_category', label: 'Income Category', permission: 'income:manage' }
        ]
      },
      { id: 'bank_accounts', label: 'Bank Accounts', icon: 'briefcase', permission: 'banking:manage' },
      { id: 'money_transfer', label: 'Money Transfer', icon: 'refresh-cw', permission: 'banking:manage' },
      { id: 'balance_sheet', label: 'Balance Sheet', icon: 'file-text', permission: 'reports:financial' },
      { id: 'trial_balance', label: 'Trial Balance', icon: 'alert-circle', permission: 'reports:financial' },
      { id: 'cash_flow', label: 'Cash Flow', icon: 'dollar-sign', permission: 'reports:financial' },
      { id: 'account_statement', label: 'Account Statement', icon: 'file', permission: 'reports:financial' },
    ]
  },
  {
    title: 'Peoples',
    items: [
      { id: 'customers', label: 'Customers', icon: 'users', permission: 'customers:manage' },
      { id: 'customer_payment', label: 'Customer Payment', icon: 'dollar-sign', permission: 'customers:manage' },
      { id: 'suppliers', label: 'Suppliers', icon: 'user', permission: 'suppliers:manage' },
      { id: 'supplier_payment', label: 'Supplier Payment', icon: 'dollar-sign', permission: 'suppliers:manage' },
      { id: 'stores', label: 'Stores', icon: 'home', permission: 'branches:manage' },
      { id: 'warehouses', label: 'Warehouses', icon: 'archive', permission: 'warehouses:manage' },
    ]
  },
  {
    title: 'HRM',
    items: [
      {
        id: 'employees',
        label: 'Employees',
        icon: 'user',
        hasChevron: true,
        permission: 'employees:manage',
        subItems: [
          { id: 'employees', label: 'Employee List', permission: 'employees:manage' },
          { id: 'add_employee', label: 'Add Employee', permission: 'employees:manage' }
        ]
      },
      { id: 'departments', label: 'Departments', icon: 'pie-chart', permission: 'departments:manage' },
      { id: 'designation', label: 'Designation', icon: 'share-2', permission: 'designations:manage' },
      { id: 'shifts', label: 'Shifts', icon: 'shuffle', permission: 'shifts:manage' },
      { id: 'attendance', label: 'Attendance', icon: 'user-check', permission: 'attendance:manage' },
      {
        id: 'leaves',
        label: 'Leaves',
        icon: 'calendar',
        hasChevron: true,
        permission: 'leaves:manage',
        subItems: [
          { id: 'leave_list', label: 'Leave Requests', permission: 'leaves:manage' },
          { id: 'leave_types', label: 'Leave Types', permission: 'leaves:manage' }
        ]
      },
      { id: 'holidays', label: 'Holidays', icon: 'calendar', permission: 'hrm:view' },
      {
        id: 'payroll',
        label: 'Payroll',
        icon: 'dollar-sign',
        hasChevron: true,
        permission: 'payroll:manage',
        subItems: [
          { id: 'payroll_list', label: 'Salary List', permission: 'payroll:manage' },
          { id: 'payroll_process', label: 'Process Payroll', permission: 'payroll:manage' }
        ]
      },
    ]
  },
  {
    title: 'Reports',
    items: [
      { id: 'sales_report', label: 'Sales Report', icon: 'bar-chart-2', permission: 'reports:view' },
      { id: 'customer_wise', label: 'Customer-Wise Report', icon: 'users', permission: 'reports:view' },
      { id: 'purchase_report', label: 'Purchase Report', icon: 'shopping-bag', permission: 'reports:view' },
      { id: 'supplier_wise', label: 'Supplier-Wise Report', icon: 'user-check', permission: 'reports:view' },
      { id: 'inventory_report', label: 'Inventory Report', icon: 'filter', permission: 'reports:view' },
      { id: 'invoice_report', label: 'Invoice Report', icon: 'file-text', permission: 'reports:view' },
      { id: 'customer_report', label: 'Customer Report', icon: 'clipboard', permission: 'reports:view' },
      { id: 'supplier_report', label: 'Supplier Report', icon: 'user', permission: 'reports:view' },
      { id: 'product_report', label: 'Product Report', icon: 'box', permission: 'reports:view' },
      { id: 'payment_report', label: 'Payment Report', icon: 'dollar-sign', permission: 'reports:view' },
      { id: 'expense_report', label: 'Expense Report', icon: 'file-minus', permission: 'reports:view' },
      { id: 'income_report', label: 'Income Report', icon: 'file-plus', permission: 'reports:view' },
      { id: 'tax_report', label: 'Tax Report', icon: 'activity', permission: 'reports:view' },
      { id: 'profit_loss', label: 'Profit & Loss', icon: 'pie-chart', permission: 'reports:view' },
      { id: 'annual_report', label: 'Annual Report', icon: 'calendar', permission: 'reports:view' },
    ]
  },
  {
    title: 'User Management',
    items: [
      { id: 'users', label: 'Users', icon: 'shield', permission: 'users:view' },
      { id: 'roles_permissions', label: 'Roles & Permissions', icon: 'key', permission: 'roles:view' },
      { id: 'sync_queue', label: 'Sync Queue', icon: 'refresh-cw', permission: 'sync:manage' },
      { id: 'delete_account_request', label: 'Delete Account Request', icon: 'trash-2', permission: 'users:manage' },
      { id: 'view_local_db', label: 'View Local DB', icon: 'list', permission: 'settings:general' },
      { id: 'delete_local_db', label: 'Delete Local DB', icon: 'trash-2', permission: 'settings:general' },
    ]
  },
  {
    title: 'Settings',
    items: [
      {
        id: 'settings',
        label: 'Settings',
        icon: 'settings',
        hasChevron: true,
        permission: 'settings:general',
        subItems: [
          { id: 'invoice_preview', label: 'Invoice Preview', permission: 'settings:general' },
          { id: 'invoice', label: 'Invoice Format', permission: 'settings:general' },
          { id: 'business', label: 'Business Profile', permission: 'settings:general' },
          { id: 'printers', label: 'Printers', permission: 'printers:manage' },
        ]
      }
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
  const isDirectActive = activeItem === item.id ||
    (item.id === 'add_product' && activeItem === 'create_product') ||
    (item.id === 'create_product' && activeItem === 'add_product') ||
    (item.id === 'employees' && (activeItem === 'employees' || activeItem === 'employee_list' || activeItem === 'add_employee')) ||
    (item.id === 'attendance' && (activeItem === 'attendance' || activeItem === 'attendance_list' || activeItem === 'attendance_report')) ||
    (item.id === 'leaves' && (activeItem === 'leaves' || activeItem === 'leave_list' || activeItem === 'leave_types')) ||
    (item.id === 'payroll' && (activeItem === 'payroll' || activeItem === 'payroll_list' || activeItem === 'payroll_process'));
  const isSubActive = hasSubItems && item.subItems!.some(sub => sub.id === activeItem);
  const isActiveGroup = isDirectActive || isSubActive;
  
  const [expanded, setExpanded] = useState(isActiveGroup);
  const prevActiveRef = useRef(activeItem);
  
  // Animation for smooth sub-heading transition
  const animatedHeight = useRef(new Animated.Value(expanded ? (item.subItems?.length || 0) * 44 : 0)).current;
  const animatedRotate = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  // Auto-expand only when activeItem changes into this group from outside
  useEffect(() => {
    if (prevActiveRef.current !== activeItem) {
      prevActiveRef.current = activeItem;
      if (isActiveGroup && !expanded) {
        setExpanded(true);
        Animated.parallel([
          Animated.timing(animatedHeight, {
            toValue: (item.subItems?.length || 0) * 44,
            duration: 250,
            useNativeDriver: false,
          }),
          Animated.timing(animatedRotate, {
            toValue: 1,
            duration: 250,
            useNativeDriver: false,
          })
        ]).start();
      }
    }
  }, [activeItem, isActiveGroup, expanded, item.subItems, animatedHeight, animatedRotate]);

  const toggleExpand = () => {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    
    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue: nextExpanded ? (item.subItems?.length || 0) * 44 : 0,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(animatedRotate, {
        toValue: nextExpanded ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      })
    ]).start();
  };

  const handlePress = () => {
    if (hasSubItems) {
      if (expanded) {
        toggleExpand();
      } else {
        toggleExpand();
        onItemPress(item.id);
      }
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
  const { permissions, userRole, isAdmin } = usePermissions();
  const { width } = useWindowDimensions();
  
  const isMobile = width < 768;

  const visibleSections = useMemo(() => {
    return menuSections
      .map((section) => {
        const items = section.items
          .map((item) => {
            const itemAllowed = !item.permission || isAdmin || hasPermission(permissions, item.permission, userRole);
            if (!itemAllowed) return null;

            if (item.subItems && item.subItems.length > 0) {
              const visibleSub = item.subItems.filter((sub) => {
                if (!sub.permission) return true;
                if (isAdmin) return true;
                return hasPermission(permissions, sub.permission, userRole);
              });
              if (visibleSub.length === 0 && !item.permission) {
                return null;
              }
              return { ...item, subItems: visibleSub };
            }

            return item;
          })
          .filter((item): item is MenuItem => item !== null);

        return {
          ...section,
          items,
        };
      })
      .filter((section) => section.items.length > 0);
  }, [permissions, userRole, isAdmin]);

  return (
    <View style={[
      styles.container, 
      { backgroundColor: theme.colors.surface, borderRightColor: theme.colors.border },
      isDrawer && styles.drawerContainer,
      isMobile && !isDrawer && { display: 'none' }
    ]}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.paddingContainer}>
          {visibleSections.map((section, index) => (
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
              
              {index < visibleSections.length - 1 && (
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



