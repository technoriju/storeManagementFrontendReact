import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Building,
} from 'lucide-react-native';
import { useCashFlow } from '../api/useAccountingReports';

export const CashFlowScreen = () => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const { data, isLoading, refetch } = useCashFlow({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const summary = data?.summary || {
    totalInflow: 0,
    totalOutflow: 0,
    netCashFlow: 0,
    bankAccountsTotal: 0,
  };

  const breakdown = data?.breakdown || [];
  const bankAccounts = data?.bankAccounts || [];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Cash Flow Statement</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Analysis of operational cash inflows, outflows and net liquid movement
          </Text>
        </View>

        <Pressable
          style={[styles.iconButton, { borderColor: theme.colors.border }]}
          onPress={() => refetch()}
        >
          <RefreshCw size={16} color={theme.colors.text} />
        </Pressable>
      </View>

      {/* KPI Cards */}
      <View style={[styles.kpiContainer, isMobile && styles.kpiContainerMobile]}>
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#DCFCE7' }]}>
            <ArrowDownLeft size={20} color="#16A34A" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Cash Inflow</Text>
            <Text style={[styles.kpiValue, { color: '#16A34A' }]}>
              +₹{summary.totalInflow.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#FEE2E2' }]}>
            <ArrowUpRight size={20} color="#DC2626" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Cash Outflow</Text>
            <Text style={[styles.kpiValue, { color: '#DC2626' }]}>
              -₹{summary.totalOutflow.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View
            style={[
              styles.kpiIconWrapper,
              { backgroundColor: summary.netCashFlow >= 0 ? '#DCFCE7' : '#FEE2E2' },
            ]}
          >
            {summary.netCashFlow >= 0 ? (
              <TrendingUp size={20} color="#16A34A" />
            ) : (
              <TrendingDown size={20} color="#DC2626" />
            )}
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Net Cash Flow</Text>
            <Text
              style={[
                styles.kpiValue,
                { color: summary.netCashFlow >= 0 ? '#16A34A' : '#DC2626' },
              ]}
            >
              {summary.netCashFlow >= 0 ? '+' : ''}₹{summary.netCashFlow.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#E0E7FF' }]}>
            <Briefcase size={20} color="#4F46E5" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Liquid Funds</Text>
            <Text style={[styles.kpiValue, { color: '#4F46E5' }]}>
              ₹{summary.bankAccountsTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>
      </View>

      {/* Cash Flow Breakdown Table / Cards */}
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Operating Cash Movement</Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
          Collections from sales versus payments to suppliers and overheads
        </Text>

        <View style={styles.breakdownList}>
          {breakdown.map((item: any, idx: number) => {
            const isInflow = item.type === 'INFLOW';
            return (
              <View key={idx} style={[styles.breakdownRow, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.breakdownLeft}>
                  <View
                    style={[
                      styles.flowIndicator,
                      { backgroundColor: isInflow ? '#DCFCE7' : '#FEE2E2' },
                    ]}
                  >
                    {isInflow ? (
                      <ArrowDownLeft size={16} color="#16A34A" />
                    ) : (
                      <ArrowUpRight size={16} color="#DC2626" />
                    )}
                  </View>
                  <View>
                    <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 14 }}>
                      {item.title}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {item.category}
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    color: isInflow ? '#16A34A' : '#DC2626',
                    fontWeight: '700',
                    fontSize: 15,
                  }}
                >
                  {isInflow ? '+' : '-'}₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Bank & Cash Accounts Liquidity Summary */}
      {bankAccounts.length > 0 && (
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginTop: 16, marginBottom: 30 }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Account Liquidity Distribution</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
            Real-time balance across bank accounts and cash drawers
          </Text>

          <View style={styles.accountGrid}>
            {bankAccounts.map((acc: any) => (
              <View
                key={acc.id}
                style={[
                  styles.accountCard,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                ]}
              >
                <View style={styles.accountCardHeader}>
                  <Building size={18} color={theme.colors.primary} />
                  <View style={[styles.badge, { backgroundColor: acc.type === 'CASH' ? '#FEF3C7' : '#E0E7FF' }]}>
                    <Text style={{ color: acc.type === 'CASH' ? '#D97706' : '#4F46E5', fontSize: 11, fontWeight: '700' }}>
                      {acc.type}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.accountCardName, { color: theme.colors.text }]} numberOfLines={1}>
                  {acc.name}
                </Text>
                <Text style={[styles.accountCardBalance, { color: '#16A34A' }]}>
                  ₹{Number(acc.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  iconButton: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  kpiContainerMobile: {
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  kpiIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  breakdownList: {
    marginTop: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flowIndicator: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  accountCard: {
    flex: 1,
    minWidth: 160,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  accountCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  accountCardName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountCardBalance: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
