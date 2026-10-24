import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { ChartPoint } from '../services/dashboard.service';

interface DashboardBarChartProps {
  data?: ChartPoint[];
  hourlyData?: ChartPoint[];
  weeklyData?: ChartPoint[];
  monthlyData?: ChartPoint[];
  isMobile?: boolean;
}

const formatCompactNumber = (num: number): string => {
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return `${Math.round(num)}`;
};

export const DashboardBarChart: React.FC<DashboardBarChartProps> = ({
  data,
  hourlyData,
  weeklyData,
  monthlyData,
  isMobile,
}) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [selectedFilter, setSelectedFilter] = useState<'1D' | '1W' | '1M' | '1Y'>('1W');
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);

  const defaultHourly: ChartPoint[] = [
    { label: '8 am', sales: 0, purchase: 0 },
    { label: '10 am', sales: 0, purchase: 0 },
    { label: '12 pm', sales: 0, purchase: 0 },
    { label: '2 pm', sales: 0, purchase: 0 },
    { label: '4 pm', sales: 0, purchase: 0 },
    { label: '6 pm', sales: 0, purchase: 0 },
    { label: '8 pm', sales: 0, purchase: 0 },
  ];

  const defaultWeekly: ChartPoint[] = [
    { label: 'Mon', sales: 0, purchase: 0 },
    { label: 'Tue', sales: 0, purchase: 0 },
    { label: 'Wed', sales: 0, purchase: 0 },
    { label: 'Thu', sales: 0, purchase: 0 },
    { label: 'Fri', sales: 0, purchase: 0 },
    { label: 'Sat', sales: 0, purchase: 0 },
    { label: 'Sun', sales: 0, purchase: 0 },
  ];

  const defaultMonthly: ChartPoint[] = [
    { label: 'May', sales: 0, purchase: 0 },
    { label: 'Jun', sales: 0, purchase: 0 },
    { label: 'Jul', sales: 0, purchase: 0 },
    { label: 'Aug', sales: 0, purchase: 0 },
    { label: 'Sep', sales: 0, purchase: 0 },
    { label: 'Oct', sales: 0, purchase: 0 },
  ];

  const currentData =
    selectedFilter === '1D'
      ? (hourlyData && hourlyData.length > 0 ? hourlyData : defaultHourly)
      : selectedFilter === '1W'
      ? (weeklyData && weeklyData.length > 0 ? weeklyData : defaultWeekly)
      : (monthlyData && monthlyData.length > 0 ? monthlyData : defaultMonthly);

  const rawMax = Math.max(...currentData.map(d => Math.max(d.sales, d.purchase, 0)), 0);
  const maxVal = rawMax > 0 ? Math.ceil(rawMax * 1.15) : 1000;

  const yAxisLabels = [
    formatCompactNumber(maxVal),
    formatCompactNumber(maxVal * 0.8),
    formatCompactNumber(maxVal * 0.6),
    formatCompactNumber(maxVal * 0.4),
    formatCompactNumber(maxVal * 0.2),
    '0',
  ];

  const selectedItem = activeBarIndex !== null && currentData[activeBarIndex] ? currentData[activeBarIndex] : null;

  const totalPurchase = currentData.reduce((acc, curr) => acc + curr.purchase, 0);
  const totalSales = currentData.reduce((acc, curr) => acc + curr.sales, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Sales & Purchase</Text>
          {selectedItem ? (
            <Text style={{ fontSize: 11, color: theme.colors.primary, marginTop: 2, fontWeight: '600' }}>
              {selectedItem.label}: Sales ₹{selectedItem.sales.toLocaleString('en-IN')} | Purchase ₹{selectedItem.purchase.toLocaleString('en-IN')}
            </Text>
          ) : (
            <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
              Periodic revenue & purchase trend
            </Text>
          )}
        </View>

        <View style={styles.filters}>
          {(['1D', '1W', '1M', '1Y'] as const).map(filter => {
            const isActive = selectedFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => {
                  setSelectedFilter(filter);
                  setActiveBarIndex(null);
                }}
                style={[
                  styles.filterChip,
                  isActive && { backgroundColor: '#F89B29' },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterText,
                    isActive ? { color: '#fff', fontWeight: '700' } : { color: theme.colors.textSecondary },
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.legend}>
        <View style={[styles.legendItem, { borderColor: theme.colors.border }]}>
          <View style={[styles.legendDot, { backgroundColor: '#FFDDB8' }]} />
          <View>
            <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]}>Total Purchase</Text>
            <Text style={[styles.legendValue, { color: theme.colors.text }]}>
              ₹{totalPurchase.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
        <View style={[styles.legendItem, { borderColor: theme.colors.border }]}>
          <View style={[styles.legendDot, { backgroundColor: '#F89B29' }]} />
          <View>
            <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]}>Total Sales</Text>
            <Text style={[styles.legendValue, { color: theme.colors.text }]}>
              ₹{totalSales.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.chartArea}>
        <View style={styles.yAxis}>
          {yAxisLabels.map((label, idx) => (
            <Text key={idx} style={[styles.axisLabel, { color: theme.colors.textSecondary }]}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.barsContainer}>
          <View style={styles.gridLines}>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <View key={i} style={[styles.gridLine, { borderBottomColor: theme.colors.border }]} />
            ))}
          </View>

          <View style={styles.bars}>
            {currentData.map((item, index) => {
              const isSelected = activeBarIndex === index;
              const barWidth = isMobile ? Math.min(22, Math.floor((width - 120) / currentData.length)) : 24;

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.barGroup}
                  onPress={() => setActiveBarIndex(isSelected ? null : index)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.barTrack, { width: Math.max(14, barWidth) }]}>
                    {/* Purchase bar (background) */}
                    <View
                      style={[
                        styles.bar,
                        {
                          backgroundColor: isSelected ? '#FFE4C4' : '#FFDDB8',
                          height: `${Math.min(100, (item.purchase / maxVal) * 100)}%`,
                        },
                      ]}
                    />
                    {/* Sales bar (foreground) */}
                    <View
                      style={[
                        styles.bar,
                        {
                          backgroundColor: isSelected ? '#E07C00' : '#F89B29',
                          height: `${Math.min(100, (item.sales / maxVal) * 100)}%`,
                          position: 'absolute',
                          bottom: 0,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.xAxisLabel,
                      { color: isSelected ? theme.colors.primary : theme.colors.textSecondary },
                      isSelected && { fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
};

interface DashboardDoughnutChartProps {
  firstTime?: number;
  returnCount?: number;
}

export const DashboardDoughnutChart: React.FC<DashboardDoughnutChartProps> = ({
  firstTime = 0,
  returnCount = 0,
}) => {
  const theme = useTheme();
  const total = firstTime + returnCount;
  const firstPct = total > 0 ? Math.round((firstTime / total) * 100) : 0;
  const returnPct = total > 0 ? 100 - firstPct : 0;

  const displayTotal = total >= 1000 ? formatCompactNumber(total) : `${total}`;
  const displayFirst = total >= 1000 ? formatCompactNumber(firstTime) : `${firstTime}`;
  const displayReturn = total >= 1000 ? formatCompactNumber(returnCount) : `${returnCount}`;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Customers Overview</Text>
        <View style={[styles.dropdown, { borderColor: theme.colors.border }]}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 10 }}>Overall</Text>
        </View>
      </View>

      <View style={styles.doughnutContent}>
        {/* Segmented visual ring representation */}
        <View style={styles.ringWrapper}>
          <View
            style={[
              styles.doughnutRing,
              {
                borderColor: '#2697FF',
                borderLeftColor: total > 0 ? '#F89B29' : theme.colors.border,
                borderBottomColor: total > 0 ? '#F89B29' : theme.colors.border,
              },
            ]}
          >
            <View style={[styles.doughnutRingInner, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.ringCenterValue, { color: theme.colors.text }]}>
                {displayTotal}
              </Text>
              <Text style={[styles.ringCenterSub, { color: theme.colors.textSecondary }]}>
                Total
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.doughnutLegendCol}>
          <View style={styles.doughnutLegendCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.legendDot, { backgroundColor: '#2697FF' }]} />
              <Text style={[styles.doughnutLabel, { color: theme.colors.textSecondary }]}>First Time</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Text style={[styles.doughnutValue, { color: theme.colors.text }]}>
                {displayFirst}
              </Text>
              <View style={[styles.badge, { backgroundColor: '#2697FF18', marginLeft: 8 }]}>
                <Text style={[styles.badgeText, { color: '#2697FF' }]}>{firstPct}%</Text>
              </View>
            </View>
          </View>

          <View style={[styles.doughnutLegendCard, { marginTop: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.legendDot, { backgroundColor: '#F89B29' }]} />
              <Text style={[styles.doughnutLabel, { color: theme.colors.textSecondary }]}>Returning</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Text style={[styles.doughnutValue, { color: theme.colors.text }]}>
                {displayReturn}
              </Text>
              <View style={[styles.badge, { backgroundColor: '#F89B2918', marginLeft: 8 }]}>
                <Text style={[styles.badgeText, { color: '#F89B29' }]}>{returnPct}%</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerMobile: {
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  filters: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  filterChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 10,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  chartArea: {
    flexDirection: 'row',
    height: 180,
    alignItems: 'stretch',
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: 8,
    paddingBottom: 22,
    alignItems: 'flex-end',
    width: 44,
  },
  axisLabel: {
    fontSize: 9.5,
  },
  barsContainer: {
    flex: 1,
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    top: 0,
    bottom: 22,
    left: 0,
    right: 0,
    justifyContent: 'space-between',
  },
  gridLine: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.35,
    width: '100%',
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 22,
  },
  barGroup: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    height: '100%',
    justifyContent: 'flex-end',
    position: 'relative',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  xAxisLabel: {
    fontSize: 10,
    position: 'absolute',
    bottom: -20,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  doughnutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  doughnutRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doughnutRingInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenterValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  ringCenterSub: {
    fontSize: 9,
    textTransform: 'uppercase',
  },
  doughnutLegendCol: {
    flex: 1,
    paddingLeft: 20,
  },
  doughnutLegendCard: {
    paddingVertical: 2,
  },
  doughnutLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  doughnutValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
