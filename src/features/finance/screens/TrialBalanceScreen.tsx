import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { AppInput } from '../../../shared/components/forms/AppInput';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Printer,
  Calendar,
} from 'lucide-react-native';
import { useTrialBalance } from '../api/useAccountingReports';

export const TrialBalanceScreen = () => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const { data, isLoading, refetch } = useTrialBalance({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const summary = data?.summary || {
    totalDebit: 0,
    totalCredit: 0,
    difference: 0,
    isBalanced: true,
  };

  const rows = data?.data || [];

  const columns = [
    {
      key: 'accountCode',
      title: 'Code',
      width: 90,
      render: (value: string) => (
        <Text style={{ color: theme.colors.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 13 }}>
          {value}
        </Text>
      ),
    },
    {
      key: 'accountName',
      title: 'Ledger Account',
      flex: 2.5,
      minWidth: 180,
      render: (value: string) => (
        <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 14 }}>
          {value}
        </Text>
      ),
    },
    {
      key: 'classification',
      title: 'Type',
      flex: 1.5,
      minWidth: 120,
      render: (value: string) => (
        <View style={[styles.classPill, { backgroundColor: '#F3F4F6' }]}>
          <Text style={{ color: '#4B5563', fontSize: 11, fontWeight: '600' }}>
            {value}
          </Text>
        </View>
      ),
    },
    {
      key: 'debit',
      title: 'Debit (Dr ₹)',
      flex: 1.5,
      minWidth: 120,
      render: (value: number) => {
        const val = Number(value || 0);
        return (
          <Text style={{ color: val > 0 ? '#1E40AF' : theme.colors.textSecondary, fontWeight: val > 0 ? '700' : '400', fontSize: 14 }}>
            {val > 0 ? `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
          </Text>
        );
      },
    },
    {
      key: 'credit',
      title: 'Credit (Cr ₹)',
      flex: 1.5,
      minWidth: 120,
      render: (value: number) => {
        const val = Number(value || 0);
        return (
          <Text style={{ color: val > 0 ? '#15803D' : theme.colors.textSecondary, fontWeight: val > 0 ? '700' : '400', fontSize: 14 }}>
            {val > 0 ? `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
          </Text>
        );
      },
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Trial Balance</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Accounting ledger balance sheet verification (Debit = Credit check)
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Pressable
            style={[styles.iconButton, { borderColor: theme.colors.border }]}
            onPress={() => refetch()}
          >
            <RefreshCw size={16} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Balanced Status Banner */}
      <View
        style={[
          styles.statusBanner,
          {
            backgroundColor: summary.isBalanced ? '#DCFCE7' : '#FEF2F2',
            borderColor: summary.isBalanced ? '#86EFAC' : '#FCA5A5',
          },
        ]}
      >
        <View style={styles.statusLeft}>
          {summary.isBalanced ? (
            <CheckCircle2 size={24} color="#16A34A" />
          ) : (
            <AlertTriangle size={24} color="#DC2626" />
          )}
          <View>
            <Text
              style={[
                styles.statusTitle,
                { color: summary.isBalanced ? '#16A34A' : '#DC2626' },
              ]}
            >
              {summary.isBalanced
                ? 'Trial Balance is in Exact Balance'
                : `Trial Balance Unbalanced by ₹${summary.difference.toLocaleString('en-IN')}`}
            </Text>
            <Text style={{ color: '#4B5563', fontSize: 12, marginTop: 2 }}>
              {summary.isBalanced
                ? 'Total debits exactly equal total credits across all accounts.'
                : 'Debits do not match credits. Please review contra entries and adjustments.'}
            </Text>
          </View>
        </View>
      </View>

      {/* Summary KPI Cards */}
      <View style={[styles.kpiContainer, isMobile && styles.kpiContainerMobile]}>
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#DBEAFE' }]}>
            <Scale size={20} color="#1E40AF" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Debits (Dr)</Text>
            <Text style={[styles.kpiValue, { color: '#1E40AF' }]}>
              ₹{summary.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#DCFCE7' }]}>
            <Scale size={20} color="#15803D" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Credits (Cr)</Text>
            <Text style={[styles.kpiValue, { color: '#15803D' }]}>
              ₹{summary.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: summary.isBalanced ? '#DCFCE7' : '#FEE2E2' }]}>
            <Calendar size={20} color={summary.isBalanced ? '#16A34A' : '#DC2626'} />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Net Difference</Text>
            <Text style={[styles.kpiValue, { color: summary.isBalanced ? '#16A34A' : '#DC2626' }]}>
              ₹{summary.difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Table */}
      <View style={styles.tableCard}>
        <AdvancedTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search ledger account or classification..."
        />
      </View>
    </View>
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
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBanner: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
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
  classPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  tableCard: {
    flex: 1,
  },
});
