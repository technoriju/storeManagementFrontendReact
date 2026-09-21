import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';

export const DashboardBarChart = () => {
  const theme = useTheme();
  
  // Dummy data representing the chart in the screenshot
  const data = [
    { label: '2 am', sales: 40, purchase: 60 },
    { label: '4 am', sales: 30, purchase: 50 },
    { label: '6 am', sales: 15, purchase: 40 },
    { label: '8 am', sales: 45, purchase: 70 },
    { label: '10 am', sales: 50, purchase: 65 },
    { label: '12 am', sales: 40, purchase: 65 },
    { label: '14 pm', sales: 25, purchase: 40 },
    { label: '16 pm', sales: 40, purchase: 50 },
    { label: '18 pm', sales: 80, purchase: 90 },
    { label: '20 pm', sales: 20, purchase: 35 },
    { label: '22 pm', sales: 60, purchase: 70 },
    { label: '24 pm', sales: 40, purchase: 50 },
  ];

  const maxVal = 100;
  const height = 200;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Sales & Purchase</Text>
        <View style={styles.filters}>
          {['1D', '1W', '1M', '3M', '6M', '1Y'].map((filter, index) => (
            <View key={filter} style={[styles.filterChip, index === 5 && { backgroundColor: '#F89B29' }]}>
              <Text style={[styles.filterText, index === 5 ? { color: '#fff' } : { color: theme.colors.textSecondary }]}>{filter}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.legend}>
        <View style={[styles.legendItem, { borderColor: theme.colors.border }]}>
          <View style={[styles.legendDot, { backgroundColor: '#FFDDB8' }]} />
          <View>
            <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]}>Total Purchase</Text>
            <Text style={[styles.legendValue, { color: theme.colors.text }]}>3K</Text>
          </View>
        </View>
        <View style={[styles.legendItem, { borderColor: theme.colors.border }]}>
          <View style={[styles.legendDot, { backgroundColor: '#F89B29' }]} />
          <View>
            <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]}>Total Sales</Text>
            <Text style={[styles.legendValue, { color: theme.colors.text }]}>1K</Text>
          </View>
        </View>
      </View>

      <View style={styles.chartArea}>
        <View style={styles.yAxis}>
          {['100K', '80K', '60K', '40K', '20K', '0K'].map((label) => (
            <Text key={label} style={[styles.axisLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
          ))}
        </View>
        
        <View style={styles.barsContainer}>
          {/* Grid lines */}
          <View style={styles.gridLines}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[styles.gridLine, { borderBottomColor: theme.colors.border }]} />
            ))}
          </View>
          
          <View style={styles.bars}>
            {data.map((item, index) => (
              <View key={index} style={styles.barGroup}>
                <View style={styles.barTrack}>
                  {/* Purchase bar (background) */}
                  <View style={[
                    styles.bar, 
                    { backgroundColor: '#FFDDB8', height: `${(item.purchase / maxVal) * 100}%` }
                  ]} />
                  {/* Sales bar (foreground, overlaying) */}
                  <View style={[
                    styles.bar, 
                    { backgroundColor: '#F89B29', height: `${(item.sales / maxVal) * 100}%`, position: 'absolute', bottom: 0 }
                  ]} />
                </View>
                <Text style={[styles.xAxisLabel, { color: theme.colors.textSecondary }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

export const DashboardDoughnutChart = () => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Customers Overview</Text>
        <View style={[styles.dropdown, { borderColor: theme.colors.border }]}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 10 }}>Today v</Text>
        </View>
      </View>

      <View style={styles.doughnutContent}>
        {/* Simplified doughnut representation using CSS borders since we don't have an SVG chart library easily available */}
        <View style={styles.doughnutCircle}>
          <View style={[styles.doughnutSlice, { borderTopColor: '#2697FF', borderRightColor: '#2697FF', transform: [{ rotate: '45deg' }] }]} />
          <View style={[styles.doughnutSlice, { borderBottomColor: '#F89B29', borderLeftColor: '#F89B29', transform: [{ rotate: '25deg' }] }]} />
          <View style={[styles.doughnutInner, { backgroundColor: theme.colors.surface }]} />
        </View>

        <View style={styles.doughnutLegend}>
          <View style={styles.doughnutLegendItem}>
            <Text style={[styles.doughnutValue, { color: theme.colors.text }]}>5.5K</Text>
            <Text style={[styles.doughnutLabel, { color: theme.colors.textSecondary }]}>First Time</Text>
            <View style={[styles.badge, { backgroundColor: '#00C49F' }]}>
              <Text style={styles.badgeText}>↗ 25%</Text>
            </View>
          </View>
          <View style={styles.doughnutLegendItem}>
            <Text style={[styles.doughnutValue, { color: theme.colors.text }]}>3.5K</Text>
            <Text style={[styles.doughnutLabel, { color: '#00C49F' }]}>Return</Text>
            <View style={[styles.badge, { backgroundColor: '#00C49F' }]}>
              <Text style={styles.badgeText}>↗ 21%</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    flex: 1,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  filters: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    padding: 2,
  },
  filterChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  filterText: {
    fontSize: 10,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginRight: 16,
    minWidth: 120,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  chartArea: {
    flexDirection: 'row',
    height: 250,
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: 12,
    paddingBottom: 24,
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
    paddingBottom: 24,
  },
  gridLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderStyle: 'dashed',
    height: 0,
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 24,
  },
  barGroup: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    width: 24,
    height: '100%',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  xAxisLabel: {
    fontSize: 9,
    position: 'absolute',
    bottom: 0,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  doughnutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  doughnutCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 16,
    borderColor: '#eee',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doughnutSlice: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 16,
    borderColor: 'transparent',
  },
  doughnutInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    position: 'absolute',
  },
  doughnutLegend: {
    flexDirection: 'row',
  },
  doughnutLegendItem: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  doughnutValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  doughnutLabel: {
    fontSize: 10,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
});
