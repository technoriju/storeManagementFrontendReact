import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
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
  const { isMobile } = useResponsive();
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
      <View style={[styles.kpiGrid, isMobile && styles.kpiGridMobile]}>
        
        {/* Net Sales */}
        <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#EFF6FF' }]}>
            <DollarSign size={isMobile ? 12 : 14} color="#2563EB" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Net Sales</Text>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: theme.colors.text }]} numberOfLines={1}>₹{Number(summary.netSales).toLocaleString()}</Text>
          </View>
        </View>

        {/* COGS */}
        <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#FEF2F2' }]}>
            <ArrowDownLeft size={isMobile ? 12 : 14} color="#EF4444" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>COGS</Text>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: '#EF4444' }]} numberOfLines={1}>₹{Number(summary.cogs).toLocaleString()}</Text>
          </View>
        </View>

        {/* Gross Profit */}
        <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#ECFDF5' }]}>
            <TrendingUp size={isMobile ? 12 : 14} color="#10B981" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Gross Profit</Text>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: '#10B981' }]} numberOfLines={1}>₹{Number(summary.grossProfit).toLocaleString()}</Text>
          </View>
        </View>

        {/* Operating Expenses */}
        <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#FFFBEB' }]}>
            <PieChart size={isMobile ? 12 : 14} color="#D97706" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Overhead</Text>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: '#D97706' }]} numberOfLines={1}>₹{Number(summary.totalExpenses).toLocaleString()}</Text>
          </View>
        </View>

        {/* Net Profit */}
        <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: isNetProfitable ? '#10B981' : '#EF4444' }]}>
          <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: isNetProfitable ? '#ECFDF5' : '#FEF2F2' }]}>
            {isNetProfitable ? (
              <ArrowUpRight size={isMobile ? 12 : 14} color="#10B981" />
            ) : (
              <TrendingDown size={isMobile ? 12 : 14} color="#EF4444" />
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>NET PROFIT</Text>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: isNetProfitable ? '#10B981' : '#EF4444' }]} numberOfLines={1}>
              ₹{Number(summary.netProfit).toLocaleString()}
            </Text>
          </View>
        </View>

      </View>

      {/* Structured Statement Card */}
      <View style={[styles.statementCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        
        {/* Card Header */}
        <View style={[styles.cardHeader, isMobile && styles.cardHeaderMobile, { borderBottomColor: theme.colors.divider }]}>
          <View>
            <Text style={[styles.cardTitle, isMobile && styles.cardTitleMobile, { color: theme.colors.text }]}>Income Statement Breakdown</Text>
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  cell: {
    paddingHorizontal: 6,
  },
  metricText: {
    fontSize: 12.5,
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
  kpiIconBoxMobile: {
    width: 30,
    height: 30,
    borderRadius: 6,
  },
  kpiLabelMobile: {
    fontSize: 10,
  },
  kpiValueMobile: {
    fontSize: 14,
    marginTop: 1,
  },
  cardHeaderMobile: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardTitleMobile: {
    fontSize: 14,
  },
});
