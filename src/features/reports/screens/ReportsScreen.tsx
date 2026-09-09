import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { ReportsService, ReportFilters } from '../services/reports.service';

const REPORT_TYPES = [
  { id: 'sales', name: 'Sales Register' },
  { id: 'purchases', name: 'Purchases Register' },
  { id: 'inventory', name: 'Inventory Valuation' },
  { id: 'gst', name: 'GST Summary' },
  { id: 'expenses', name: 'Expense Log' },
];

export const ReportsScreen = () => {
  const theme = useTheme();
  const [activeReport, setActiveReport] = useState('sales');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({});

  const loadData = async () => {
    setLoading(true);
    try {
      let result = [];
      switch (activeReport) {
        case 'sales':
          result = await ReportsService.getSalesReport(filters);
          break;
        case 'purchases':
          result = await ReportsService.getPurchasesReport(filters);
          break;
        case 'inventory':
          result = await ReportsService.getInventoryReport(filters);
          break;
        case 'gst':
          result = await ReportsService.getGSTReport(filters);
          break;
        case 'expenses':
          result = await ReportsService.getExpensesReport(filters);
          break;
      }
      setData(result);
    } catch (e) {
      console.error('Error loading report', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeReport, filters]);

  const handleExport = () => {
    // In a real app, generate CSV/PDF and share/download
    console.log(`Exporting ${activeReport} report...`);
  };

  const renderTableHeader = () => {
    if (data.length === 0) return null;
    const keys = Object.keys(data[0]).filter(k => k !== 'id');
    return (
      <View style={[styles.tableRow, styles.tableHeaderRow, { borderBottomColor: theme.colors.border }]}>
        {keys.map(k => (
          <Text key={k} style={[styles.tableCell, styles.tableHeaderCell, { color: theme.colors.textSecondary }]}>
            {k.replace(/([A-Z])/g, ' $1').trim()}
          </Text>
        ))}
      </View>
    );
  };

  const renderTableRows = () => {
    if (data.length === 0 && !loading) {
      return (
        <View style={styles.emptyState}>
          <Text style={{ color: theme.colors.textSecondary }}>No data found for this period.</Text>
        </View>
      );
    }
    
    return data.map((item, index) => {
      const keys = Object.keys(item).filter(k => k !== 'id');
      return (
        <View key={item.id || index} style={[styles.tableRow, { borderBottomColor: theme.colors.border }]}>
          {keys.map(k => (
            <Text key={k} style={[styles.tableCell, { color: theme.colors.text }]} numberOfLines={1}>
              {typeof item[k] === 'number' ? (k.toLowerCase().includes('total') || k.toLowerCase().includes('gst') || k.toLowerCase().includes('amount') || k.toLowerCase().includes('value') ? `₹${item[k].toFixed(2)}` : item[k]) : item[k]}
            </Text>
          ))}
        </View>
      );
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Sidebar for report types */}
      <View style={[styles.sidebar, { borderRightColor: theme.colors.border }]}>
        <Text style={[styles.sidebarTitle, { color: theme.colors.text }]}>Reports</Text>
        <ScrollView>
          {REPORT_TYPES.map(report => (
            <TouchableOpacity
              key={report.id}
              style={[
                styles.reportNavItem,
                activeReport === report.id && { backgroundColor: theme.colors.primary + '1A', borderRightWidth: 3, borderRightColor: theme.colors.primary }
              ]}
              onPress={() => setActiveReport(report.id)}
            >
              <Text style={[
                styles.reportNavText,
                { color: activeReport === report.id ? theme.colors.primary : theme.colors.textSecondary,
                  fontWeight: activeReport === report.id ? '600' : '400' }
              ]}>
                {report.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main content area */}
      <View style={styles.mainContent}>
        <View style={[styles.toolbar, { borderBottomColor: theme.colors.border }]}>
          <ScrollView style={{ flex: 1, marginRight: 16 }} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersArea}>
            <TextInput 
              style={[styles.filterInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Start Date (YYYY-MM-DD)"
              placeholderTextColor={theme.colors.textSecondary}
              onChangeText={(text) => setFilters(prev => ({ ...prev, startDate: text || undefined }))}
            />
            <TextInput 
              style={[styles.filterInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="End Date (YYYY-MM-DD)"
              placeholderTextColor={theme.colors.textSecondary}
              onChangeText={(text) => setFilters(prev => ({ ...prev, endDate: text || undefined }))}
            />
            <TextInput 
              style={[styles.filterInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Branch ID"
              placeholderTextColor={theme.colors.textSecondary}
              onChangeText={(text) => setFilters(prev => ({ ...prev, branchId: text || undefined }))}
            />
            <TextInput 
              style={[styles.filterInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Product ID"
              placeholderTextColor={theme.colors.textSecondary}
              onChangeText={(text) => setFilters(prev => ({ ...prev, productId: text || undefined }))}
            />
            <TextInput 
              style={[styles.filterInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="Customer ID"
              placeholderTextColor={theme.colors.textSecondary}
              onChangeText={(text) => setFilters(prev => ({ ...prev, customerId: text || undefined }))}
            />
          </ScrollView>
          <TouchableOpacity style={[styles.exportButton, { backgroundColor: theme.colors.text }]} onPress={handleExport}>
            <Text style={[styles.exportButtonText, { color: theme.colors.background }]}>Export Data</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tableContainer}>
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.text} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView horizontal style={styles.tableScroll}>
              <View>
                {renderTableHeader()}
                <ScrollView>
                  {renderTableRows()}
                </ScrollView>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    paddingVertical: 24,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 24,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  reportNavItem: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  reportNavText: {
    fontSize: 15,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
  },
  filtersArea: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 16,
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 150,
    fontSize: 14,
  },
  exportButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tableContainer: {
    flex: 1,
    padding: 24,
  },
  tableScroll: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 16,
  },
  tableHeaderRow: {
    borderBottomWidth: 2,
  },
  tableCell: {
    width: 150,
    paddingRight: 16,
    fontSize: 14,
  },
  tableHeaderCell: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
});
