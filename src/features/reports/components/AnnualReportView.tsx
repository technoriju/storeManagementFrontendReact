import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { Calendar, TrendingUp, DollarSign, ShoppingBag, PieChart, ArrowUpRight } from 'lucide-react-native';

interface AnnualReportViewProps {
  data: any;
  dateRangeLabel?: string;
}

export const AnnualReportView: React.FC<AnnualReportViewProps> = ({
  data,
  dateRangeLabel = 'FY 2025 - 2026',
}) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const summary = data?.summary || {
    totalTurnover: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    totalNetProfit: 0,
    totalOrders: 0,
    avgNetMargin: 0,
    growthRate: 0,
  };
  const months = data?.months || [];

  const maxSales = Math.max(...months.map((m: any) => m.sales || 0), 1);

  return (
    <View style={styles.container}>
      {/* KPI Cards */}
      <View style={[styles.kpiGrid, isMobile && styles.kpiGridMobile]}>
        
        {/* Annual Turnover */}
        <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#EFF6FF' }]}>
            <DollarSign size={isMobile ? 12 : 14} color="#2563EB" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Annual Turnover</Text>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: theme.colors.text }]} numberOfLines={1}>₹{Number(summary.totalTurnover).toLocaleString()}</Text>
          </View>
        </View>

        {/* Annual Purchases */}
        <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#F5F3FF' }]}>
            <ShoppingBag size={isMobile ? 12 : 14} color="#7C3AED" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Annual Purchases</Text>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: '#7C3AED' }]} numberOfLines={1}>₹{Number(summary.totalPurchases).toLocaleString()}</Text>
          </View>
        </View>

        {/* Operating Overhead */}
        <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#FFFBEB' }]}>
            <PieChart size={isMobile ? 12 : 14} color="#D97706" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Annual Expenses</Text>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: '#D97706' }]} numberOfLines={1}>₹{Number(summary.totalExpenses).toLocaleString()}</Text>
          </View>
        </View>

        {/* Annual Net Profit */}
        <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: '#10B981' }]}>
          <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#ECFDF5' }]}>
            <TrendingUp size={isMobile ? 12 : 14} color="#10B981" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Annual Net Profit</Text>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: '#10B981' }]} numberOfLines={1}>₹{Number(summary.totalNetProfit).toLocaleString()}</Text>
          </View>
        </View>

      </View>

      {/* 12-Month Comparative Table */}
      <View style={[styles.statementCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        
        {/* Card Header */}
        <View style={[styles.cardHeader, isMobile && styles.cardHeaderMobile, { borderBottomColor: theme.colors.divider }]}>
          <View>
            <Text style={[styles.cardTitle, isMobile && styles.cardTitleMobile, { color: theme.colors.text }]}>Month-by-Month Financial Performance</Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
              Comparative sales volume, procurement, and bottom-line margin • {dateRangeLabel}
            </Text>
          </View>
        </View>

        {/* Table Rows */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: '100%' }}>
          <View style={{ minWidth: 840, width: '100%' }}>
            
            {/* Table Header */}
            <View style={[styles.rowHeader, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.divider }]}>
              <Text style={[styles.cell, { width: 110, fontWeight: '700', color: theme.colors.textSecondary }]}>MONTH</Text>
              <Text style={[styles.cell, { width: 180, fontWeight: '700', color: theme.colors.textSecondary }]}>SALES REVENUE (₹)</Text>
              <Text style={[styles.cell, { width: 130, fontWeight: '700', color: theme.colors.textSecondary }]}>PURCHASES (₹)</Text>
              <Text style={[styles.cell, { width: 120, fontWeight: '700', color: theme.colors.textSecondary }]}>EXPENSES (₹)</Text>
              <Text style={[styles.cell, { width: 130, fontWeight: '700', color: theme.colors.textSecondary }]}>NET PROFIT (₹)</Text>
              <Text style={[styles.cell, { width: 90, textAlign: 'right', fontWeight: '700', color: theme.colors.textSecondary }]}>MARGIN %</Text>
              <Text style={[styles.cell, { width: 80, textAlign: 'right', fontWeight: '700', color: theme.colors.textSecondary }]}>ORDERS</Text>
            </View>

            {/* Rows */}
            {months.map((m: any, idx: number) => {
              const barPercent = Math.min(100, Math.round((m.sales / maxSales) * 100));

              return (
                <View
                  key={idx}
                  style={[
                    styles.row,
                    { borderBottomColor: theme.colors.divider }
                  ]}
                >
                  <Text style={[styles.cell, { width: 110, fontWeight: '600', color: theme.colors.text }]}>
                    {m.month}
                  </Text>

                  {/* Sales with visual mini-bar */}
                  <View style={[styles.cell, { width: 180 }]}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text }}>
                      ₹{Number(m.sales).toLocaleString()}
                    </Text>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${barPercent}%`, backgroundColor: theme.colors.primary }]} />
                    </View>
                  </View>

                  <Text style={[styles.cell, { width: 130, color: theme.colors.textSecondary, fontSize: 13 }]}>
                    ₹{Number(m.purchases).toLocaleString()}
                  </Text>

                  <Text style={[styles.cell, { width: 120, color: '#D97706', fontSize: 13 }]}>
                    ₹{Number(m.expenses).toLocaleString()}
                  </Text>

                  <Text style={[styles.cell, { width: 130, color: '#10B981', fontWeight: '700', fontSize: 13 }]}>
                    ₹{Number(m.netProfit).toLocaleString()}
                  </Text>

                  <Text style={[styles.cell, { width: 90, textAlign: 'right', color: theme.colors.text, fontWeight: '600', fontSize: 13 }]}>
                    {m.margin}%
                  </Text>

                  <Text style={[styles.cell, { width: 80, textAlign: 'right', color: theme.colors.textSecondary, fontSize: 13 }]}>
                    {m.orders}
                  </Text>
                </View>
              );
            })}

            {/* Total Footer Row */}
            <View style={[styles.row, { backgroundColor: theme.colors.background, borderTopWidth: 2, borderTopColor: theme.colors.divider }]}>
              <Text style={[styles.cell, { width: 110, fontWeight: '800', color: theme.colors.text }]}>TOTAL</Text>
              <Text style={[styles.cell, { width: 180, fontWeight: '800', color: theme.colors.text, fontSize: 14 }]}>
                ₹{Number(summary.totalTurnover).toLocaleString()}
              </Text>
              <Text style={[styles.cell, { width: 130, fontWeight: '800', color: theme.colors.textSecondary, fontSize: 14 }]}>
                ₹{Number(summary.totalPurchases).toLocaleString()}
              </Text>
              <Text style={[styles.cell, { width: 120, fontWeight: '800', color: '#D97706', fontSize: 14 }]}>
                ₹{Number(summary.totalExpenses).toLocaleString()}
              </Text>
              <Text style={[styles.cell, { width: 130, fontWeight: '800', color: '#10B981', fontSize: 14 }]}>
                ₹{Number(summary.totalNetProfit).toLocaleString()}
              </Text>
              <Text style={[styles.cell, { width: 90, textAlign: 'right', fontWeight: '800', color: theme.colors.text, fontSize: 14 }]}>
                {summary.avgNetMargin}%
              </Text>
              <Text style={[styles.cell, { width: 80, textAlign: 'right', fontWeight: '800', color: theme.colors.text, fontSize: 14 }]}>
                {summary.totalOrders}
              </Text>
            </View>

          </View>
        </ScrollView>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kpiIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 13.5,
    fontWeight: '700',
    marginTop: 0,
  },
  kpiSub: {
    fontSize: 9.5,
    marginTop: 0,
  },
  statementCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  cell: {
    paddingHorizontal: 6,
  },
  barBg: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  kpiGridMobile: {
    gap: 6,
  },
  kpiCardMobile: {
    minWidth: '47%',
    padding: 5,
    gap: 6,
    borderRadius: 6,
  },
  kpiIconBoxMobile: {
    width: 22,
    height: 22,
    borderRadius: 5,
  },
  kpiLabelMobile: {
    fontSize: 9,
  },
  kpiValueMobile: {
    fontSize: 12,
    marginTop: 0,
  },
  cardHeaderMobile: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardTitleMobile: {
    fontSize: 14,
  },
});
