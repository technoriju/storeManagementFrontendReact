import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useAuthStore } from '../../../core/auth/auth.store';
import { DashboardService, DashboardMetrics } from '../services/dashboard.service';
import { DashboardCard } from '../components/DashboardCard';
import { DashboardBarChart, DashboardDoughnutChart } from '../components/DashboardChart';
import {
  Calendar,
  FileText,
  RefreshCcw,
  Gift,
  Shield,
  Layers,
  Clock,
  Target,
  Hash,
  Users,
  UserPlus,
  ShoppingCart,
  PlusCircle,
  AlertTriangle,
  ChevronRight,
  Package,
  Receipt,
  FolderTree,
  GitCommit,
  Tag,
  Scale,
  Copy,
  PieChart,
  CreditCard,
  TrendingUp,
} from 'lucide-react-native';
import { format } from 'date-fns';

interface QuickActionConfig {
  id: string;
  label: string;
  route: string;
  icon: (color: string) => React.ReactNode;
  color: string;
  bgColor: string;
}

const QUICK_ACTIONS: QuickActionConfig[] = [
  {
    id: 'category',
    label: 'Category',
    route: 'category',
    icon: (col) => <FolderTree size={19} color={col} />,
    color: '#2563EB',
    bgColor: '#EFF6FF',
  },
  {
    id: 'sub_category',
    label: 'Subcategory',
    route: 'sub_category',
    icon: (col) => <GitCommit size={19} color={col} />,
    color: '#0284C7',
    bgColor: '#F0F9FF',
  },
  {
    id: 'brands',
    label: 'Brand',
    route: 'brands',
    icon: (col) => <Tag size={19} color={col} />,
    color: '#7C3AED',
    bgColor: '#F5F3FF',
  },
  {
    id: 'units',
    label: 'Unit',
    route: 'units',
    icon: (col) => <Scale size={19} color={col} />,
    color: '#DB2777',
    bgColor: '#FDF2F8',
  },
  {
    id: 'sub_units',
    label: 'Subunit',
    route: 'sub_units',
    icon: (col) => <Copy size={19} color={col} />,
    color: '#E11D48',
    bgColor: '#FFF1F2',
  },
  {
    id: 'stock',
    label: 'Stock',
    route: 'manage_stock',
    icon: (col) => <Package size={19} color={col} />,
    color: '#10B981',
    bgColor: '#ECFDF5',
  },
  {
    id: 'reports',
    label: 'Report',
    route: 'reports',
    icon: (col) => <FileText size={19} color={col} />,
    color: '#F59E0B',
    bgColor: '#FFFBEB',
  },
  {
    id: 'balancesheet',
    label: 'Balance Sheet',
    route: 'profit_loss',
    icon: (col) => <PieChart size={19} color={col} />,
    color: '#6366F1',
    bgColor: '#EEF2FF',
  },
  {
    id: 'payment',
    label: 'Payment',
    route: 'customer_payment',
    icon: (col) => <CreditCard size={19} color={col} />,
    color: '#0D9488',
    bgColor: '#F0FDFA',
  },
  {
    id: 'pos',
    label: 'POS Sale',
    route: 'pos',
    icon: (col) => <ShoppingCart size={19} color={col} />,
    color: '#EA580C',
    bgColor: '#FFF7ED',
  },
  {
    id: 'add_product',
    label: 'Add Product',
    route: 'add_product',
    icon: (col) => <PlusCircle size={19} color={col} />,
    color: '#2564FF',
    bgColor: '#EFF6FF',
  },
  {
    id: 'invoices',
    label: 'Invoices',
    route: 'invoices',
    icon: (col) => <Receipt size={19} color={col} />,
    color: '#F89B29',
    bgColor: '#FEF3C7',
  },
];

interface DashboardScreenProps {
  onNavigateTab?: (tab: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigateTab }) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const currentUser = useAuthStore((s) => s.user);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isMobile = width < 768;

  const loadMetrics = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const data = await DashboardService.getMetrics(isRefresh);
      setMetrics(data);
    } catch (error) {
      console.error('Dashboard: failed to load metrics', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const formatCurrency = (val: number | undefined): string => {
    const num = val !== undefined && !isNaN(val) ? val : 0;
    return `₹${Math.round(num).toLocaleString('en-IN')}`;
  };

  if (loading && !metrics) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 12, color: theme.colors.textSecondary, fontSize: 13 }}>
          Loading dashboard metrics...
        </Text>
      </View>
    );
  }

  const todayStr = format(new Date(), 'dd/MM/yyyy');
  const greetingName = currentUser?.name || 'Admin';
  const m = metrics || {
    todaySales: 0,
    todayPurchases: 0,
    currentStockValue: 0,
    outstanding: 0,
    profit: 0,
    expenses: 0,
    todayOrdersCount: 0,
    totalSales: 0,
    totalPurchases: 0,
    totalSalesReturn: 0,
    totalPurchaseReturn: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    totalProducts: 0,
    lowStockCount: 0,
    recentSales: [],
    hourlySalesData: [],
    weeklySalesData: [],
    monthlySalesData: [],
    customerDistribution: { firstTime: 0, returnCount: 0 },
  };

  // -------------------------------------------------------------
  // MOBILE VIEW (< 768px)
  // -------------------------------------------------------------
  if (isMobile) {
    const numCols = width < 380 ? 4 : width < 520 ? 5 : 6;
    const horizontalPadding = 28;
    const quickActionItemWidth = Math.floor((width - horizontalPadding) / numCols);

    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.mobileContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadMetrics(true)}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Mobile Header Greeting */}
        <View style={styles.mobileHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.greetingText, { color: theme.colors.text }]}>
                Welcome, {greetingName}
              </Text>
              <View style={[styles.activeDot, { backgroundColor: '#00C49F' }]} />
            </View>
            <Text style={[styles.mobileSubtitle, { color: theme.colors.textSecondary }]}>
              <Text style={{ color: '#F89B29', fontWeight: '700' }}>
                {m.todayOrdersCount} {m.todayOrdersCount === 1 ? 'Order' : 'Orders'}
              </Text>{' '}
              recorded today
            </Text>
          </View>

          <View style={[styles.dateChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Calendar size={13} color={theme.colors.textSecondary} style={{ marginRight: 5 }} />
            <Text style={[styles.dateChipText, { color: theme.colors.textSecondary }]}>{todayStr}</Text>
          </View>
        </View>

        {/* Quick Actions Launcher */}
        <View style={styles.quickActionsSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderTitleWrapper}>
              <View style={[styles.sectionHeaderAccent, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
            </View>
            <View style={[styles.sectionDividerLine, { backgroundColor: theme.colors.border }]} />
          </View>

          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.quickActionFooterBtn, { width: quickActionItemWidth }]}
                onPress={() => onNavigateTab?.(action.route)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.quickActionIconCircle,
                    {
                      backgroundColor: theme.isDark ? `${action.color}22` : action.bgColor,
                      borderColor: theme.isDark ? `${action.color}44` : `${action.color}30`,
                    },
                  ]}
                >
                  {action.icon(action.color)}
                </View>
                <Text
                  style={[styles.quickActionFooterLabel, { color: theme.colors.text }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.quickActionsBottomLine, { backgroundColor: theme.colors.border }]} />
        </View>

        {/* Low Stock Contextual Banner */}
        {m.lowStockCount > 0 && (
          <TouchableOpacity
            style={[styles.alertBanner, { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }]}
            onPress={() => onNavigateTab?.('low_stocks')}
            activeOpacity={0.8}
          >
            <AlertTriangle size={16} color="#EA580C" style={{ marginRight: 8 }} />
            <Text style={styles.alertBannerText}>
              <Text style={{ fontWeight: '700' }}>{m.lowStockCount} items</Text> are low on stock. Tap to review.
            </Text>
            <ChevronRight size={15} color="#EA580C" />
          </TouchableOpacity>
        )}

        {/* 2x2 Financial KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiRow}>
            <DashboardCard
              variant="compact"
              title="Today Sales"
              value={formatCurrency(m.todaySales)}
              icon={<FileText size={14} color="#F89B29" />}
              color="#F89B29"
              style={styles.kpiGridCard}
              onViewAll={() => onNavigateTab?.('pos')}
            />
            <DashboardCard
              variant="compact"
              title="Today Purchase"
              value={formatCurrency(m.todayPurchases)}
              icon={<Gift size={14} color="#1E9B85" />}
              color="#1E9B85"
              style={styles.kpiGridCard}
              onViewAll={() => onNavigateTab?.('purchases')}
            />
          </View>

          <View style={styles.kpiRow}>
            <DashboardCard
              variant="compact"
              title="Invoice Due"
              value={formatCurrency(m.outstanding)}
              icon={<Clock size={14} color="#FF4560" />}
              color="#FF4560"
              style={styles.kpiGridCard}
              onViewAll={() => onNavigateTab?.('customers')}
            />
            <DashboardCard
              variant="compact"
              title="Stock Value"
              value={formatCurrency(m.currentStockValue)}
              icon={<Layers size={14} color="#2664FF" />}
              color="#2664FF"
              style={styles.kpiGridCard}
              onViewAll={() => onNavigateTab?.('manage_stock')}
            />
          </View>

          {/* Secondary financial indicators */}
          <View style={styles.kpiRow}>
            <DashboardCard
              variant="compact"
              title="Today Profit"
              value={formatCurrency(m.profit)}
              icon={<TrendingUp size={14} color="#00C49F" />}
              color="#00C49F"
              style={styles.kpiGridCard}
              onViewAll={() => onNavigateTab?.('profit_loss')}
            />
            <DashboardCard
              variant="compact"
              title="All-Time Sales"
              value={formatCurrency(m.totalSales)}
              icon={<Receipt size={14} color="#6366F1" />}
              color="#6366F1"
              style={styles.kpiGridCard}
              onViewAll={() => onNavigateTab?.('reports')}
            />
          </View>
        </View>

        {/* Responsive Real Bar Chart */}
        <DashboardBarChart
          hourlyData={m.hourlySalesData}
          weeklyData={m.weeklySalesData}
          monthlyData={m.monthlySalesData}
          isMobile={true}
        />

        {/* Real Customer Distribution Doughnut Chart */}
        <DashboardDoughnutChart
          firstTime={m.customerDistribution?.firstTime ?? 0}
          returnCount={m.customerDistribution?.returnCount ?? 0}
        />

        {/* Overall Directory Counts */}
        <View style={[styles.overallMobileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.overallCardHeading, { color: theme.colors.text }]}>Overall Directory</Text>
          <View style={styles.infoCardsRow}>
            <TouchableOpacity
              style={[styles.infoCard, { borderColor: theme.colors.border }]}
              onPress={() => onNavigateTab?.('suppliers')}
              activeOpacity={0.7}
            >
              <UserPlus size={20} color="#2664FF" />
              <Text style={[styles.infoCardTitle, { color: theme.colors.textSecondary }]}>Suppliers</Text>
              <Text style={[styles.infoCardValue, { color: theme.colors.text }]}>
                {m.totalSuppliers}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.infoCard, { borderColor: theme.colors.border }]}
              onPress={() => onNavigateTab?.('customers')}
              activeOpacity={0.7}
            >
              <Users size={20} color="#FF4560" />
              <Text style={[styles.infoCardTitle, { color: theme.colors.textSecondary }]}>Customers</Text>
              <Text style={[styles.infoCardValue, { color: theme.colors.text }]}>
                {m.totalCustomers}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.infoCard, { borderColor: theme.colors.border }]}
              onPress={() => onNavigateTab?.('products')}
              activeOpacity={0.7}
            >
              <ShoppingCart size={20} color="#00C49F" />
              <Text style={[styles.infoCardTitle, { color: theme.colors.textSecondary }]}>Products</Text>
              <Text style={[styles.infoCardValue, { color: theme.colors.text }]}>
                {m.totalProducts}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Real Recent Invoices Feed */}
        <View style={[styles.recentSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.recentHeader}>
            <View>
              <Text style={[styles.recentTitle, { color: theme.colors.text }]}>Recent Invoices</Text>
              <Text style={[styles.recentSubtitle, { color: theme.colors.textSecondary }]}>
                Latest transactions recorded
              </Text>
            </View>
            <TouchableOpacity onPress={() => onNavigateTab?.('invoices')}>
              <Text style={[styles.viewAllRecent, { color: theme.colors.primary }]}>View All →</Text>
            </TouchableOpacity>
          </View>

          {m.recentSales.length > 0 ? (
            m.recentSales.map((sale) => (
              <View key={sale.id} style={[styles.saleRow, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.saleRowLeft}>
                  <Text style={[styles.saleInvoiceNum, { color: theme.colors.text }]}>{sale.invoiceNumber}</Text>
                  <Text style={[styles.saleCustomer, { color: theme.colors.textSecondary }]}>
                    {sale.customerName} • {sale.date}
                  </Text>
                </View>
                <View style={styles.saleRowRight}>
                  <Text style={[styles.saleAmount, { color: theme.colors.text }]}>
                    ₹{sale.total.toLocaleString('en-IN')}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          sale.paymentStatus.toLowerCase() === 'paid'
                            ? '#E6F9F4'
                            : sale.paymentStatus.toLowerCase() === 'partial'
                            ? '#FEF3C7'
                            : '#FFF7ED',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color:
                            sale.paymentStatus.toLowerCase() === 'paid'
                              ? '#00C49F'
                              : sale.paymentStatus.toLowerCase() === 'partial'
                              ? '#D97706'
                              : '#EA580C',
                        },
                      ]}
                    >
                      {sale.paymentStatus.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyRecentBox}>
              <Receipt size={24} color={theme.colors.textSecondary} style={{ marginBottom: 6 }} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>No recent sales recorded</Text>
              <TouchableOpacity
                style={[styles.startSaleBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => onNavigateTab?.('pos')}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Create First Sale</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  // -------------------------------------------------------------
  // DESKTOP VIEW (>= 768px)
  // -------------------------------------------------------------
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadMetrics(true)}
          colors={[theme.colors.primary]}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>
            Welcome, {greetingName}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            You have{' '}
            <Text style={{ color: '#F89B29', fontWeight: '700' }}>
              {m.todayOrdersCount} {m.todayOrdersCount === 1 ? 'Order' : 'Orders'}
            </Text>{' '}
            recorded today
          </Text>
        </View>
        <View
          style={[
            styles.datePicker,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
          ]}
        >
          <Calendar size={16} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
          <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>{todayStr}</Text>
        </View>
      </View>

      {/* Row 1: Primary Metrics */}
      <View style={styles.cardRow}>
        <DashboardCard
          variant="primary"
          title="Today Sales"
          value={formatCurrency(m.todaySales)}
          icon={<FileText size={20} color="#F89B29" />}
          trend={`${m.todayOrdersCount} orders`}
          trendUp={m.todaySales > 0}
          color="#F89B29"
          onViewAll={() => onNavigateTab?.('pos')}
        />
        <DashboardCard
          variant="primary"
          title="Total Sales Return"
          value={formatCurrency(m.totalSalesReturn)}
          icon={<RefreshCcw size={20} color="#1C2E46" />}
          trend="Returns"
          trendUp={false}
          color="#1C2E46"
          onViewAll={() => onNavigateTab?.('sales_return')}
        />
        <DashboardCard
          variant="primary"
          title="Today Purchase"
          value={formatCurrency(m.todayPurchases)}
          icon={<Gift size={20} color="#1E9B85" />}
          trend="Purchases"
          trendUp={m.todayPurchases > 0}
          color="#1E9B85"
          onViewAll={() => onNavigateTab?.('purchases')}
        />
        <DashboardCard
          variant="primary"
          title="Total Purchase Return"
          value={formatCurrency(m.totalPurchaseReturn)}
          icon={<Shield size={20} color="#2664FF" />}
          trend="Returns"
          trendUp={true}
          color="#2664FF"
          onViewAll={() => onNavigateTab?.('purchase_return')}
        />
      </View>

      {/* Row 2: Secondary Indicators */}
      <View style={styles.cardRow}>
        <DashboardCard
          variant="secondary"
          title="Profit (Today)"
          value={formatCurrency(m.profit)}
          icon={<Layers size={16} color="#00C49F" />}
          trend="Gross"
          trendUp={m.profit >= 0}
          color="#00C49F"
          onViewAll={() => onNavigateTab?.('profit_loss')}
        />
        <DashboardCard
          variant="secondary"
          title="Invoice Due"
          value={formatCurrency(m.outstanding)}
          icon={<Clock size={16} color="#00C49F" />}
          trend="Receivables"
          trendUp={false}
          color="#00C49F"
          onViewAll={() => onNavigateTab?.('customers')}
        />
        <DashboardCard
          variant="secondary"
          title="Today Expenses"
          value={formatCurrency(m.expenses)}
          icon={<Target size={16} color="#FF4560" />}
          trend="Outflow"
          trendUp={false}
          color="#FF4560"
          onViewAll={() => onNavigateTab?.('reports')}
        />
        <DashboardCard
          variant="secondary"
          title="Stock Value"
          value={formatCurrency(m.currentStockValue)}
          icon={<Hash size={16} color="#8A2BE2" />}
          trend={`${m.totalProducts} items`}
          trendUp={true}
          color="#8A2BE2"
          onViewAll={() => onNavigateTab?.('manage_stock')}
        />
      </View>

      {/* Bottom Section: Chart and Right Panel */}
      <View style={styles.bottomSection}>
        <View style={styles.chartContainer}>
          <DashboardBarChart
            hourlyData={m.hourlySalesData}
            weeklyData={m.weeklySalesData}
            monthlyData={m.monthlySalesData}
            isMobile={false}
          />

          {/* Desktop Recent Invoices Feed */}
          <View style={[styles.recentSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginTop: 16 }]}>
            <View style={styles.recentHeader}>
              <View>
                <Text style={[styles.recentTitle, { color: theme.colors.text }]}>Recent Invoices</Text>
                <Text style={[styles.recentSubtitle, { color: theme.colors.textSecondary }]}>
                  Latest transactions recorded
                </Text>
              </View>
              <TouchableOpacity onPress={() => onNavigateTab?.('invoices')}>
                <Text style={[styles.viewAllRecent, { color: theme.colors.primary }]}>View All →</Text>
              </TouchableOpacity>
            </View>

            {m.recentSales.length > 0 ? (
              m.recentSales.map((sale) => (
                <View key={sale.id} style={[styles.saleRow, { borderBottomColor: theme.colors.border }]}>
                  <View style={styles.saleRowLeft}>
                    <Text style={[styles.saleInvoiceNum, { color: theme.colors.text }]}>{sale.invoiceNumber}</Text>
                    <Text style={[styles.saleCustomer, { color: theme.colors.textSecondary }]}>
                      {sale.customerName} • {sale.date}
                    </Text>
                  </View>
                  <View style={styles.saleRowRight}>
                    <Text style={[styles.saleAmount, { color: theme.colors.text }]}>
                      ₹{sale.total.toLocaleString('en-IN')}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            sale.paymentStatus.toLowerCase() === 'paid'
                              ? '#E6F9F4'
                              : sale.paymentStatus.toLowerCase() === 'partial'
                              ? '#FEF3C7'
                              : '#FFF7ED',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color:
                              sale.paymentStatus.toLowerCase() === 'paid'
                                ? '#00C49F'
                                : sale.paymentStatus.toLowerCase() === 'partial'
                                ? '#D97706'
                                : '#EA580C',
                          },
                        ]}
                      >
                        {sale.paymentStatus.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyRecentBox}>
                <Receipt size={24} color={theme.colors.textSecondary} style={{ marginBottom: 6 }} />
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>No recent sales recorded</Text>
                <TouchableOpacity
                  style={[styles.startSaleBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={() => onNavigateTab?.('pos')}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Create First Sale</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.rightPanel}>
          <View
            style={[
              styles.overallInfoContainer,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.overallHeader}>
              <View style={[styles.infoIcon, { backgroundColor: theme.colors.background }]}>
                <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>i</Text>
              </View>
              <Text style={[styles.overallTitle, { color: theme.colors.text }]}>Overall Directory</Text>
            </View>

            <View style={styles.infoCardsRow}>
              <TouchableOpacity
                style={[styles.infoCard, { borderColor: theme.colors.border }]}
                onPress={() => onNavigateTab?.('suppliers')}
                activeOpacity={0.7}
              >
                <UserPlus size={24} color="#2664FF" />
                <Text style={[styles.infoCardTitle, { color: theme.colors.textSecondary }]}>Suppliers</Text>
                <Text style={[styles.infoCardValue, { color: theme.colors.text }]}>
                  {m.totalSuppliers}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.infoCard, { borderColor: theme.colors.border }]}
                onPress={() => onNavigateTab?.('customers')}
                activeOpacity={0.7}
              >
                <Users size={24} color="#FF4560" />
                <Text style={[styles.infoCardTitle, { color: theme.colors.textSecondary }]}>Customers</Text>
                <Text style={[styles.infoCardValue, { color: theme.colors.text }]}>
                  {m.totalCustomers}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.infoCard, { borderColor: theme.colors.border }]}
                onPress={() => onNavigateTab?.('products')}
                activeOpacity={0.7}
              >
                <ShoppingCart size={24} color="#00C49F" />
                <Text style={[styles.infoCardTitle, { color: theme.colors.textSecondary }]}>Products</Text>
                <Text style={[styles.infoCardValue, { color: theme.colors.text }]}>
                  {m.totalProducts}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <DashboardDoughnutChart
            firstTime={m.customerDistribution?.firstTime ?? 0}
            returnCount={m.customerDistribution?.returnCount ?? 0}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  chartContainer: {
    flex: 2,
    marginRight: 16,
  },
  rightPanel: {
    flex: 1,
    minWidth: 300,
  },
  overallInfoContainer: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  overallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  overallTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  infoCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  infoCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  infoCardTitle: {
    fontSize: 11,
    marginTop: 8,
    marginBottom: 4,
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: '800',
  },

  // -------------------------------------------------
  // Mobile Specific Styles
  // -------------------------------------------------
  mobileContent: {
    padding: 14,
    paddingBottom: 28,
  },
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '800',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  mobileSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Quick Action Launcher
  quickActionsSection: {
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionHeaderAccent: {
    width: 3.5,
    height: 13,
    borderRadius: 2,
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.6,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  quickActionFooterBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    marginBottom: 8,
  },
  quickActionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionFooterLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
  },
  quickActionsBottomLine: {
    height: 1,
    width: '100%',
    marginTop: 4,
    marginBottom: 2,
    opacity: 0.6,
  },

  // Alert Banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  alertBannerText: {
    flex: 1,
    color: '#9A3412',
    fontSize: 11.5,
  },

  // KPI Grid
  kpiGrid: {
    gap: 8,
    marginBottom: 14,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiGridCard: {
    flex: 1,
  },

  // Mobile Directory
  overallMobileCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  overallCardHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },

  // Recent Feed
  recentSection: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  recentSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  viewAllRecent: {
    fontSize: 12,
    fontWeight: '600',
  },
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  saleRowLeft: {
    flex: 1,
  },
  saleInvoiceNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  saleCustomer: {
    fontSize: 11,
    marginTop: 2,
  },
  saleRowRight: {
    alignItems: 'flex-end',
  },
  saleAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  emptyRecentBox: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  startSaleBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
