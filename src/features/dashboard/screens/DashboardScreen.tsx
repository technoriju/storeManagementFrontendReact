import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { DashboardService, DashboardMetrics } from '../services/dashboard.service';

export const DashboardScreen = () => {
  const theme = useTheme();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

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
      <View style={styles.header}>
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <Text style={[styles.title, { color: theme.colors.text }]}>Today's Pulse</Text>
      </View>

      {/* Hero Section: The most important numbers with a stark, ledger-like design */}
      <View style={[styles.heroGrid, { borderTopColor: theme.colors.text, borderBottomColor: theme.colors.text }]}>
        <View style={[styles.heroCell, { borderRightColor: theme.colors.text }]}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Sales</Text>
          <Text style={[styles.heroValue, { color: theme.colors.text }]}>
            ₹{metrics.todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.heroCell}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Profit</Text>
          <Text style={[styles.heroValue, { color: metrics.profit >= 0 ? theme.colors.success : theme.colors.error }]}>
            ₹{metrics.profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      {/* Secondary Metrics: Structured list rather than floating cards */}
      <View style={styles.secondarySection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Business Overview</Text>
        
        <View style={styles.metricsList}>
          <MetricRow 
            label="Purchases" 
            value={metrics.todayPurchases} 
            theme={theme}
          />
          <MetricRow 
            label="Expenses" 
            value={metrics.expenses} 
            theme={theme}
          />
          <MetricRow 
            label="Current Stock Value" 
            value={metrics.currentStockValue} 
            theme={theme} 
          />
          <MetricRow 
            label="Outstanding Balance" 
            value={metrics.outstanding} 
            theme={theme} 
            isLast
          />
        </View>
      </View>
    </ScrollView>
  );
};

const MetricRow = ({ label, value, theme, isLast = false }: any) => (
  <View style={[
    styles.metricRow, 
    { borderBottomColor: theme.colors.border },
    isLast && { borderBottomWidth: 0 }
  ]}>
    <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.metricValue, { color: theme.colors.text }]}>
      ₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
    </Text>
  </View>
);

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
    paddingTop: 48,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 32,
  },
  date: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
    fontWeight: '600',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  heroGrid: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    paddingVertical: 24,
    marginBottom: 48,
  },
  heroCell: {
    flex: 1,
    paddingHorizontal: 16,
    borderRightWidth: 1,
  },
  label: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    fontWeight: '600',
  },
  heroValue: {
    fontSize: 42,
    fontWeight: '300',
    letterSpacing: -1.5,
  },
  secondarySection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  metricsList: {
    borderWidth: 1,
    borderColor: 'transparent', // Inherits from theme in row
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  metricLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
  },
});
