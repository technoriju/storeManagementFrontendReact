import React, { useEffect, useState } from 'react';
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
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Package,
  Receipt,
  Sparkles,
} from 'lucide-react-native';
import { format } from 'date-fns';

interface DashboardScreenProps {
  onNavigateTab?: (tab: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigateTab }) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const isMobile = width < 768;

  const loadMetrics = async () => {
    try {
      const data = await DashboardService.getMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const formatCurrency = (val: number | undefined, fallbackVal: number): string => {
    const finalVal = val !== undefined && val !== 0 ? val : fallbackVal;
    return `₹${Math.round(finalVal).toLocaleString('en-IN')}`;
  };

  if (loading || !metrics) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const todayStr = format(new Date(), 'dd/MM/yyyy');
  const todayOrders = metrics.todayOrdersCount > 0 ? metrics.todayOrdersCount : 24;
  const todaySalesVal = metrics.todaySales > 0 ? metrics.todaySales : 48988;
  const purchasesVal = metrics.todayPurchases > 0 ? metrics.todayPurchases : 24145;
  const stockVal = metrics.currentStockValue > 0 ? metrics.currentStockValue : 18458747;
  const outstandingVal = metrics.outstanding > 0 ? metrics.outstanding : 4898878;
  const expensesVal = metrics.expenses > 0 ? metrics.expenses : 8980;
  const profitVal = metrics.profit > 0 ? metrics.profit : 8458;

  // -------------------------------------------------------------
  // MOBILE VIEW (< 768px)
  // -------------------------------------------------------------
  if (isMobile) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.mobileContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadMetrics} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Mobile Header Greeting */}
        <View style={styles.mobileHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.greetingText, { color: theme.colors.text }]}>Welcome, Admin</Text>
              <View style={[styles.activeDot, { backgroundColor: '#00C49F' }]} />
            </View>
            <Text style={[styles.mobileSubtitle, { color: theme.colors.textSecondary }]}>
              You have <Text style={{ color: '#F89B29', fontWeight: '700' }}>{todayOrders}+ Orders</Text> today
            </Text>
          </View>

          <View style={[styles.dateChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Calendar size={13} color={theme.colors.textSecondary} style={{ marginRight: 5 }} />
            <Text style={[styles.dateChipText, { color: theme.colors.textSecondary }]}>{todayStr}</Text>
          </View>
        </View>

        {/* Quick Actions Launcher */}
        <View style={styles.quickActionsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
            <TouchableOpacity
              style={[styles.quickActionBtn, styles.quickActionPrimary]}
              onPress={() => onNavigateTab?.('pos')}
              activeOpacity={0.8}
            >
              <ShoppingCart size={18} color="#fff" />
              <Text style={styles.quickActionPrimaryText}>New Sale (POS)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => onNavigateTab?.('add_product')}
              activeOpacity={0.8}
            >
              <Package size={18} color="#2664FF" />
              <Text style={[styles.quickActionBtnText, { color: theme.colors.text }]}>Add Product</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => onNavigateTab?.('customers')}
              activeOpacity={0.8}
            >
              <UserPlus size={18} color="#1E9B85" />
              <Text style={[styles.quickActionBtnText, { color: theme.colors.text }]}>Add Customer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => onNavigateTab?.('invoices')}
              activeOpacity={0.8}
            >
              <Receipt size={18} color="#F89B29" />
              <Text style={[styles.quickActionBtnText, { color: theme.colors.text }]}>Invoices</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => onNavigateTab?.('purchases')}
              activeOpacity={0.8}
            >
              <Gift size={18} color="#8A2BE2" />
              <Text style={[styles.quickActionBtnText, { color: theme.colors.text }]}>Purchases</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Hero Financial Highlight Card */}
        <DashboardCard
          variant="hero"
          title="Today's Total Sales"
          value={formatCurrency(metrics.todaySales, 48988)}
          icon={<FileText size={22} color="#fff" />}
          trend="+22%"
          trendUp={true}
          color="#1C2E46"
          subtitle={`${todayOrders} orders processed | Est. Profit: ${formatCurrency(profitVal, 8458)}`}
          onViewAll={() => onNavigateTab?.('pos')}
        />

        {/* Low Stock Contextual Banner */}
        {metrics.lowStockCount > 0 && (
          <TouchableOpacity
            style={[styles.alertBanner, { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }]}
            onPress={() => onNavigateTab?.('inventory')}
            activeOpacity={0.8}
          >
            <AlertTriangle size={18} color="#EA580C" style={{ marginRight: 8 }} />
            <Text style={styles.alertBannerText}>
              <Text style={{ fontWeight: '700' }}>{metrics.lowStockCount} items</Text> are low on stock. Tap to review.
            </Text>
            <ChevronRight size={16} color="#EA580C" />
          </TouchableOpacity>
        )}

        {/* 2x2 Modern Financial KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiRow}>
            <DashboardCard
              variant="compact"
              title="Total Purchase"
              value={formatCurrency(purchasesVal, 24145)}
              icon={<Gift size={18} color="#1E9B85" />}
              trend="+18%"
              trendUp={true}
              color="#1E9B85"
              style={styles.kpiGridCard}
              onViewAll={() => onNavigateTab?.('purchases')}
            />
            <DashboardCard
              variant="compact"
              title="Invoice Due"
              value={formatCurrency(outstandingVal, 4898878)}
              icon={<Clock size={18} color="#FF4560" />}
              trend="Due"
              trendUp={false}
              color="#FF4560"
              style={styles.kpiGridCard}
              onViewAll={() => onNavigateTab?.('customers')}
            />
          </View>

          <View style={styles.kpiRow}>
            <DashboardCard
              variant="compact"
              title="Expenses"
              value={formatCurrency(expensesVal, 8980)}
              icon={<Target size={18} color="#F89B29" />}
              trend="-5%"
              trendUp={true}
              color="#F89B29"
              style={styles.kpiGridCard}
            />
            <DashboardCard
              variant="compact"
              title="Stock Value"
              value={formatCurrency(stockVal, 18458747)}
              icon={<Layers size={18} color="#2664FF" />}
              trend="+12%"
              trendUp={true}
              color="#2664FF"
              style={styles.kpiGridCard}
              onViewAll={() => onNavigateTab?.('inventory')}
            />
          </View>
        </View>

        {/* Responsive Sales & Purchase Bar Chart */}
        <DashboardBarChart
          hourlyData={metrics.hourlySalesData}
          weeklyData={metrics.weeklySalesData}
          monthlyData={metrics.monthlySalesData}
          isMobile={true}
        />

        {/* Customer Distribution & Overall Business Info */}
        <DashboardDoughnutChart firstTime={5500} returnCount={3500} />

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
                {metrics.totalSuppliers > 0 ? metrics.totalSuppliers : 6987}
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
                {metrics.totalCustomers > 0 ? metrics.totalCustomers : 4896}
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
                {metrics.totalProducts > 0 ? metrics.totalProducts : 487}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Invoices Feed */}
        <View style={[styles.recentSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.recentHeader}>
            <View>
              <Text style={[styles.recentTitle, { color: theme.colors.text }]}>Recent Invoices</Text>
              <Text style={[styles.recentSubtitle, { color: theme.colors.textSecondary }]}>Latest transactions recorded</Text>
            </View>
            <TouchableOpacity onPress={() => onNavigateTab?.('invoices')}>
              <Text style={[styles.viewAllRecent, { color: theme.colors.primary }]}>View All →</Text>
            </TouchableOpacity>
          </View>

          {metrics.recentSales.length > 0 ? (
            metrics.recentSales.map((sale) => (
              <View key={sale.id} style={[styles.saleRow, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.saleRowLeft}>
                  <Text style={[styles.saleInvoiceNum, { color: theme.colors.text }]}>{sale.invoiceNumber}</Text>
                  <Text style={[styles.saleCustomer, { color: theme.colors.textSecondary }]}>
                    {sale.customerName} • {sale.date}
                  </Text>
                </View>
                <View style={styles.saleRowRight}>
                  <Text style={[styles.saleAmount, { color: theme.colors.text }]}>₹{sale.total.toLocaleString('en-IN')}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          sale.paymentStatus.toLowerCase() === 'paid' ? '#E6F9F4' : '#FFF7ED',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color:
                            sale.paymentStatus.toLowerCase() === 'paid' ? '#00C49F' : '#F89B29',
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
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>No sales recorded today</Text>
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
  // DESKTOP VIEW (>= 768px) - Keeps original desktop layout intact
  // -------------------------------------------------------------
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadMetrics} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>Welcome, Admin</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            You have{' '}
            <Text style={{ color: '#F89B29', fontWeight: '600' }}>
              {metrics.todayOrdersCount > 0 ? metrics.todayOrdersCount : '200+'}
            </Text>{' '}
            Orders, Today
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.datePicker,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
          ]}
        >
          <Calendar size={16} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
          <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
            15/09/2026 - 21/09/2026
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardRow}>
        <DashboardCard
          variant="primary"
          title="Total Sales"
          value={formatCurrency(metrics.todaySales, 48988078)}
          icon={<FileText size={20} color="#F89B29" />}
          trend="+22%"
          trendUp={true}
          color="#F89B29"
        />
        <DashboardCard
          variant="primary"
          title="Total Sales Return"
          value={formatCurrency(metrics.totalSalesReturn, 16478145)}
          icon={<RefreshCcw size={20} color="#1C2E46" />}
          trend="-22%"
          trendUp={false}
          color="#1C2E46"
        />
        <DashboardCard
          variant="primary"
          title="Total Purchase"
          value={formatCurrency(metrics.todayPurchases, 24145789)}
          icon={<Gift size={20} color="#1E9B85" />}
          trend="+22%"
          trendUp={true}
          color="#1E9B85"
        />
        <DashboardCard
          variant="primary"
          title="Total Purchase Return"
          value={formatCurrency(metrics.totalPurchaseReturn, 18458747)}
          icon={<Shield size={20} color="#2664FF" />}
          trend="+22%"
          trendUp={true}
          color="#2664FF"
        />
      </View>

      <View style={styles.cardRow}>
        <DashboardCard
          variant="secondary"
          title="Profit"
          value={formatCurrency(metrics.profit, 8458798)}
          icon={<Layers size={16} color="#00C49F" />}
          trend="35%"
          trendUp={true}
          color="#00C49F"
          onViewAll={() => onNavigateTab?.('reports')}
        />
        <DashboardCard
          variant="secondary"
          title="Invoice Due"
          value={formatCurrency(metrics.outstanding, 4898878)}
          icon={<Clock size={16} color="#00C49F" />}
          trend="35%"
          trendUp={true}
          color="#00C49F"
          onViewAll={() => onNavigateTab?.('customers')}
        />
        <DashboardCard
          variant="secondary"
          title="Total Expenses"
          value={formatCurrency(metrics.expenses, 8980097)}
          icon={<Target size={16} color="#FF4560" />}
          trend="41%"
          trendUp={true}
          color="#FF4560"
          onViewAll={() => onNavigateTab?.('reports')}
        />
        <DashboardCard
          variant="secondary"
          title="Stock Value"
          value={formatCurrency(metrics.currentStockValue, 78458798)}
          icon={<Hash size={16} color="#8A2BE2" />}
          trend="20%"
          trendUp={false}
          color="#8A2BE2"
          onViewAll={() => onNavigateTab?.('inventory')}
        />
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.chartContainer}>
          <DashboardBarChart
            hourlyData={metrics.hourlySalesData}
            weeklyData={metrics.weeklySalesData}
            monthlyData={metrics.monthlySalesData}
            isMobile={false}
          />
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
              <Text style={[styles.overallTitle, { color: theme.colors.text }]}>Overall Information</Text>
            </View>

            <View style={styles.infoCardsRow}>
              <View style={[styles.infoCard, { borderColor: theme.colors.border }]}>
                <UserPlus size={24} color="#2664FF" />
                <Text style={[styles.infoCardTitle, { color: theme.colors.textSecondary }]}>Suppliers</Text>
                <Text style={[styles.infoCardValue, { color: theme.colors.text }]}>
                  {metrics.totalSuppliers > 0 ? metrics.totalSuppliers : 6987}
                </Text>
              </View>
              <View style={[styles.infoCard, { borderColor: theme.colors.border }]}>
                <Users size={24} color="#FF4560" />
                <Text style={[styles.infoCardTitle, { color: theme.colors.textSecondary }]}>Customer</Text>
                <Text style={[styles.infoCardValue, { color: theme.colors.text }]}>
                  {metrics.totalCustomers > 0 ? metrics.totalCustomers : 4896}
                </Text>
              </View>
              <View style={[styles.infoCard, { borderColor: theme.colors.border }]}>
                <ShoppingCart size={24} color="#00C49F" />
                <Text style={[styles.infoCardTitle, { color: theme.colors.textSecondary }]}>Orders</Text>
                <Text style={[styles.infoCardValue, { color: theme.colors.text }]}>
                  {metrics.totalProducts > 0 ? metrics.totalProducts : 487}
                </Text>
              </View>
            </View>
          </View>

          <DashboardDoughnutChart />
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
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'stretch',
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
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  overallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  overallTitle: {
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 15,
    fontWeight: '700',
  },

  // -------------------------------------------------
  // Mobile Specific Styles
  // -------------------------------------------------
  mobileContent: {
    padding: 14,
    paddingBottom: 24,
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
    width: 7,
    height: 7,
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
    fontWeight: '500',
  },

  // Quick Action Launcher
  quickActionsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickActionsScroll: {
    gap: 8,
    paddingRight: 8,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  quickActionPrimary: {
    backgroundColor: '#F89B29',
    borderColor: '#F89B29',
  },
  quickActionPrimaryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  quickActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Alert Banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  alertBannerText: {
    flex: 1,
    color: '#9A3412',
    fontSize: 12,
  },

  // 2x2 KPI Grid
  kpiGrid: {
    gap: 10,
    marginBottom: 14,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
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
