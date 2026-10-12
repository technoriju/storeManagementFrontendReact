import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { ChartPoint } from '../services/dashboard.service';

interface DashboardBarChartProps {
  data?: ChartPoint[];
  hourlyData?: ChartPoint[];
  weeklyData?: ChartPoint[];
  monthlyData?: ChartPoint[];
  isMobile?: boolean;
}

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
    { label: '8 am', sales: 25, purchase: 40 },
    { label: '10 am', sales: 45, purchase: 65 },
    { label: '12 pm', sales: 65, purchase: 50 },
    { label: '2 pm', sales: 40, purchase: 35 },
    { label: '4 pm', sales: 85, purchase: 60 },
    { label: '6 pm', sales: 95, purchase: 70 },
    { label: '8 pm', sales: 50, purchase: 30 },
  ];

  const defaultWeekly: ChartPoint[] = [
    { label: 'Mon', sales: 45, purchase: 30 },
    { label: 'Tue', sales: 60, purchase: 45 },
    { label: 'Wed', sales: 35, purchase: 55 },
    { label: 'Thu', sales: 80, purchase: 40 },
    { label: 'Fri', sales: 70, purchase: 65 },
    { label: 'Sat', sales: 90, purchase: 85 },
    { label: 'Sun', sales: 65, purchase: 20 },
  ];

  const defaultMonthly: ChartPoint[] = [
    { label: 'Jan', sales: 50, purchase: 40 },
    { label: 'Feb', sales: 65, purchase: 50 },
    { label: 'Mar', sales: 85, purchase: 70 },
    { label: 'Apr', sales: 75, purchase: 60 },
    { label: 'May', sales: 90, purchase: 80 },
    { label: 'Jun', sales: 95, purchase: 85 },
  ];

  const currentData =
    selectedFilter === '1D'
      ? hourlyData || defaultHourly
      : selectedFilter === '1W'
      ? weeklyData || defaultWeekly
      : monthlyData || defaultMonthly;

  const maxVal = Math.max(...currentData.map(d => Math.max(d.sales, d.purchase, 100)), 100);

  const selectedItem = activeBarIndex !== null && currentData[activeBarIndex] ? currentData[activeBarIndex] : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Sales & Purchase</Text>
          {selectedItem && (
            <Text style={{ fontSize: 11, color: theme.colors.primary, marginTop: 2 }}>
              {selectedItem.label}: Sales {selectedItem.sales}k | Purchase {selectedItem.purchase}k
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
              {currentData.reduce((acc, curr) => acc + curr.purchase, 0)}K
            </Text>
          </View>
        </View>
        <View style={[styles.legendItem, { borderColor: theme.colors.border }]}>
          <View style={[styles.legendDot, { backgroundColor: '#F89B29' }]} />
          <View>
            <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]}>Total Sales</Text>
            <Text style={[styles.legendValue, { color: theme.colors.text }]}>
              {currentData.reduce((acc, curr) => acc + curr.sales, 0)}K
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.chartArea}>
        <View style={styles.yAxis}>
          {['100K', '80K', '60K', '40K', '20K', '0K'].map(label => (
            <Text key={label} style={[styles.axisLabel, { color: theme.colors.textSecondary }]}>
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
              const barWidth = isMobile ? Math.min(20, Math.floor((width - 120) / currentData.length)) : 22;

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
  firstTime = 5500,
  returnCount = 3500,
}) => {
  const theme = useTheme();
  const total = firstTime + returnCount;
  const firstPct = total > 0 ? Math.round((firstTime / total) * 100) : 60;
  const returnPct = 100 - firstPct;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Customers Overview</Text>
        <View style={[styles.dropdown, { borderColor: theme.colors.border }]}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 10 }}>Overall</Text>
        </View>
      </View>

      <View style={styles.doughnutContent}>
        {/* Modern clean segmented visual ring representation */}
        <View style={styles.ringWrapper}>
          <View
            style={[
              styles.doughnutRing,
              {
                borderColor: '#2697FF',
                borderLeftColor: '#F89B29',
                borderBottomColor: '#F89B29',
              },
            ]}
          >
            <View style={[styles.doughnutRingInner, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.ringCenterValue, { color: theme.colors.text }]}>
                {Math.round(total / 1000)}k
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
                {(firstTime / 1000).toFixed(1)}K
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
                {(returnCount / 1000).toFixed(1)}K
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
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  filterChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  filterText: {
    fontSize: 11,
  },
  legend: {
    flexDirection: 'row',
    marginBottom: 18,
    gap: 12,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flex: 1,
    minWidth: 110,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 10,
    marginBottom: 1,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  chartArea: {
    flexDirection: 'row',
    height: 200,
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: 8,
    paddingBottom: 22,
  },
  axisLabel: {
    fontSize: 9,
  },
  barsContainer: {
    flex: 1,
    position: 'relative',
  },
  gridLines: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    paddingBottom: 22,
  },
  gridLine: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    height: 0,
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
    marginBottom: 6,
    position: 'relative',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  xAxisLabel: {
    fontSize: 9,
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
    paddingVertical: 10,
    flexWrap: 'wrap',
    gap: 16,
  },
  ringWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  doughnutRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doughnutRingInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCenterValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  ringCenterSub: {
    fontSize: 9,
  },
  doughnutLegendCol: {
    flex: 1,
    minWidth: 140,
  },
  doughnutLegendCard: {
    padding: 6,
  },
  doughnutValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  doughnutLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
