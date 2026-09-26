import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { DashboardService, DashboardMetrics } from '../services/dashboard.service';
import { DashboardCard } from '../components/DashboardCard';
import { DashboardBarChart, DashboardDoughnutChart } from '../components/DashboardChart';
import { Calendar, FileText, RefreshCcw, Gift, Shield, Layers, Clock, Target, Hash, Users, UserPlus, ShoppingCart } from 'lucide-react-native';

export const DashboardScreen = () => {
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

  if (loading || !metrics) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.text} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadMetrics} />}
    >
      <View style={[styles.header, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View>
          <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>Welcome, Admin</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            You have <Text style={{ color: '#F89B29', fontWeight: '600' }}>200+</Text> Orders, Today
          </Text>
        </View>
        <TouchableOpacity style={[styles.datePicker, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginTop: isMobile ? 16 : 0 }]}>
          <Calendar size={16} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
          <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>15/09/2026 - 21/09/2026</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardRow}>
        <DashboardCard
          variant="primary"
          title="Total Sales"
          value={`$48,988,078`}
          icon={<FileText size={20} color="#F89B29" />}
          trend="+22%"
          trendUp={true}
          color="#F89B29"
        />
        <DashboardCard
          variant="primary"
          title="Total Sales Return"
          value={`$16,478,145`}
          icon={<RefreshCcw size={20} color="#1C2E46" />}
          trend="-22%"
          trendUp={false}
          color="#1C2E46"
        />
        <DashboardCard
          variant="primary"
          title="Total Purchase"
          value={`$24,145,789`}
          icon={<Gift size={20} color="#1E9B85" />}
          trend="+22%"
          trendUp={true}
          color="#1E9B85"
        />
        <DashboardCard
          variant="primary"
          title="Total Purchase Return"
          value={`$18,458,747`}
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
          value={`$8,458,798`}
          icon={<Layers size={16} color="#00C49F" />}
          trend="35%"
          trendUp={true}
          color="#00C49F"
          onViewAll={() => {}}
        />
        <DashboardCard
          variant="secondary"
          title="Invoice Due"
          value={`$48,988,78`}
          icon={<Clock size={16} color="#00C49F" />}
          trend="35%"
          trendUp={true}
          color="#00C49F"
          onViewAll={() => {}}
        />
        <DashboardCard
          variant="secondary"
          title="Total Expenses"
          value={`$8,980,097`}
          icon={<Target size={16} color="#FF4560" />}
          trend="41%"
          trendUp={true}
          color="#FF4560"
          onViewAll={() => {}}
        />
        <DashboardCard
          variant="secondary"
          title="Total Payment Returns"
          value={`$78,458,798`}
          icon={<Hash size={16} color="#8A2BE2" />}
          trend="20%"
          trendUp={false}
          color="#8A2BE2"
          onViewAll={() => {}}
        />
      </View>

      <View style={[styles.bottomSection, isMobile && { flexDirection: 'column' }]}>
        <View style={[styles.chartContainer, isMobile && { marginRight: 0, marginBottom: 16 }]}>
          <DashboardBarChart />
        </View>
        
        <View style={styles.rightPanel}>
          <View style={[styles.overallInfoContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
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
                <Text style={[styles.infoCardValue, { color: theme.colors.text }]}>6987</Text>
              </View>
              <View style={[styles.infoCard, { borderColor: theme.colors.border }]}>
                <Users size={24} color="#FF4560" />
                <Text style={[styles.infoCardTitle, { color: theme.colors.textSecondary }]}>Customer</Text>
                <Text style={[styles.infoCardValue, { color: theme.colors.text }]}>4896</Text>
              </View>
              <View style={[styles.infoCard, { borderColor: theme.colors.border }]}>
                <ShoppingCart size={24} color="#00C49F" />
                <Text style={[styles.infoCardTitle, { color: theme.colors.textSecondary }]}>Orders</Text>
                <Text style={[styles.infoCardValue, { color: theme.colors.text }]}>487</Text>
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
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
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
    borderRadius: 8,
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
  },
  infoCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  infoCardTitle: {
    fontSize: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});


