import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Percent, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';

interface ProfitLossViewProps {
  data: any;
  dateRangeLabel?: string;
}

export const ProfitLossView: React.FC<ProfitLossViewProps> = ({
  data,
  dateRangeLabel = 'Current Financial Period',
}) => {
  const theme = useTheme();
  const summary = data?.summary || {
    grossSales: 0,
    totalDiscount: 0,
    netSales: 0,
    cogs: 0,
    grossProfit: 0,
    grossMarginPercent: 0,
    totalExpenses: 0,
    netProfit: 0,
    netMarginPercent: 0,
  };
  const items = data?.items || [];

  const isNetProfitable = summary.netProfit >= 0;

  return (
    <View style={styles.container}>
      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        
        {/* Net Sales */}
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#EFF6FF' }]}>
            <DollarSign size={20} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Net Sales Revenue</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>₹{Number(summary.netSales).toLocaleString()}</Text>
            <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>Gross ₹{Number(summary.grossSales).toLocaleString()}</Text>
          </View>
        </View>

        {/* COGS */}
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#FEF2F2' }]}>
            <ArrowDownLeft size={20} color="#EF4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Cost of Goods (COGS)</Text>
            <Text style={[styles.kpiValue, { color: '#EF4444' }]}>₹{Number(summary.cogs).toLocaleString()}</Text>
            <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>Direct wholesale costs</Text>
          </View>
        </View>

        {/* Gross Profit */}
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#ECFDF5' }]}>
            <TrendingUp size={20} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Gross Profit</Text>
            <Text style={[styles.kpiValue, { color: '#10B981' }]}>₹{Number(summary.grossProfit).toLocaleString()}</Text>
            <Text style={[styles.kpiSub, { color: '#10B981' }]}>Margin {summary.grossMarginPercent}%</Text>
          </View>
        </View>

        {/* Operating Expenses */}
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#FFFBEB' }]}>
            <PieChart size={20} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Operating Overhead</Text>
            <Text style={[styles.kpiValue, { color: '#D97706' }]}>₹{Number(summary.totalExpenses).toLocaleString()}</Text>
            <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>Store rent, salaries, utilities</Text>
          </View>
        </View>

        {/* Net Profit */}
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: isNetProfitable ? '#10B981' : '#EF4444' }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: isNetProfitable ? '#ECFDF5' : '#FEF2F2' }]}>
            {isNetProfitable ? (
              <ArrowUpRight size={20} color="#10B981" />
            ) : (
              <TrendingDown size={20} color="#EF4444" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>NET PROFIT / (LOSS)</Text>
            <Text style={[styles.kpiValue, { color: isNetProfitable ? '#10B981' : '#EF4444' }]}>
              ₹{Number(summary.netProfit).toLocaleString()}
            </Text>
            <Text style={[styles.kpiSub, { color: isNetProfitable ? '#10B981' : '#EF4444', fontWeight: '600' }]}>
              Net Margin: {summary.netMarginPercent}%
            </Text>
          </View>
        </View>

      </View>

      {/* Structured Statement Card */}
      <View style={[styles.statementCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        
        {/* Card Header */}
        <View style={[styles.cardHeader, { borderBottomColor: theme.colors.divider }]}>
          <View>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Income Statement Breakdown</Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
              GAAP compliant profit & loss accounting schedule • {dateRangeLabel}
            </Text>
          </View>
        </View>

        {/* Statement Rows */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: '100%' }}>
          <View style={{ minWidth: 700, width: '100%' }}>
            
            {/* Table Header */}
            <View style={[styles.rowHeader, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.divider }]}>
              <Text style={[styles.cell, { flex: 2.5, fontWeight: '700', color: theme.colors.textSecondary }]}>PARTICULARS / ACCOUNT HEAD</Text>
              <Text style={[styles.cell, { flex: 1.5, fontWeight: '700', color: theme.colors.textSecondary }]}>CATEGORY</Text>
              <Text style={[styles.cell, { flex: 2, fontWeight: '700', color: theme.colors.textSecondary }]}>NOTES</Text>
              <Text style={[styles.cell, { flex: 1.5, textAlign: 'right', fontWeight: '700', color: theme.colors.textSecondary }]}>AMOUNT (₹)</Text>
            </View>

            {/* Rows */}
            {items.map((item: any, idx: number) => {
              const isHighlight = item.type === 'highlight';
              const isSubtotal = item.type === 'subtotal';
              const isDebit = item.type === 'debit';

              return (
                <View
                  key={idx}
                  style={[
                    styles.row,
                    { borderBottomColor: theme.colors.divider },
                    isHighlight && { backgroundColor: theme.colors.primary + '0A' },
                    isSubtotal && { backgroundColor: theme.colors.background + '80' },
                  ]}
                >
                  <View style={[styles.cell, { flex: 2.5, flexDirection: 'row', alignItems: 'center' }]}>
                    <Text
                      style={[
                        styles.metricText,
                        { color: theme.colors.text },
                        (isHighlight || isSubtotal) && { fontWeight: '700', fontSize: 14 }
                      ]}
                    >
                      {item.metric}
                    </Text>
                  </View>

                  <Text style={[styles.cell, { flex: 1.5, color: theme.colors.textSecondary, fontSize: 13 }]}>
                    {item.category}
                  </Text>

                  <Text style={[styles.cell, { flex: 2, color: theme.colors.textSecondary, fontSize: 12 }]} numberOfLines={1}>
                    {item.notes}
                  </Text>

                  <Text
                    style={[
                      styles.cell,
                      { flex: 1.5, textAlign: 'right', fontSize: 14, fontWeight: '600' },
                      isHighlight
                        ? { color: item.amount >= 0 ? '#10B981' : '#EF4444', fontWeight: '800' }
                        : isDebit
                        ? { color: '#EF4444' }
                        : { color: theme.colors.text }
                    ]}
                  >
                    {isDebit && !isHighlight ? '-' : ''}₹{Number(item.amount).toLocaleString()}
                  </Text>
                </View>
              );
            })}

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
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: 200,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kpiIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 11,
    marginTop: 2,
  },
  statementCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
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
  metricText: {
    fontSize: 13,
  },
});
