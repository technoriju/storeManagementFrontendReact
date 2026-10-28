import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import {
  FileText,
  Building,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
} from 'lucide-react-native';
import { useBankAccounts, useAccountStatement } from '../api/useBankAccounts';

interface AccountStatementScreenProps {
  initialAccountId?: number;
}

export const AccountStatementScreen: React.FC<AccountStatementScreenProps> = ({ initialAccountId }) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const { data: accounts = [] } = useBankAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(initialAccountId);

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const { data: statement, isLoading, refetch } = useAccountStatement(selectedAccountId);

  const summary = statement?.summary || {
    openingBalance: 0,
    totalDebit: 0,
    totalCredit: 0,
    closingBalance: 0,
  };

  const entries = statement?.entries || [];
  const selectedAccount = statement?.account || accounts.find((a) => a.id === selectedAccountId);

  const columns = [
    {
      key: 'date',
      title: 'Date',
      flex: 1.2,
      minWidth: 100,
      render: (value: string | undefined) => {
        const d = value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
        return <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>{d}</Text>;
      },
    },
    {
      key: 'reference',
      title: 'Voucher Ref',
      flex: 1.2,
      minWidth: 110,
      render: (value: string | undefined) => (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
          {value || '-'}
        </Text>
      ),
    },
    {
      key: 'description',
      title: 'Description',
      flex: 2.5,
      minWidth: 180,
      render: (value: string | undefined) => (
        <Text style={{ color: theme.colors.text, fontSize: 13 }} numberOfLines={2}>
          {value || '-'}
        </Text>
      ),
    },
    {
      key: 'debit',
      title: 'Debit (Dr ₹)',
      flex: 1.3,
      minWidth: 110,
      render: (value: number) => {
        const val = Number(value || 0);
        return (
          <Text style={{ color: val > 0 ? '#DC2626' : theme.colors.textSecondary, fontWeight: val > 0 ? '700' : '400', fontSize: 13 }}>
            {val > 0 ? `-₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
          </Text>
        );
      },
    },
    {
      key: 'credit',
      title: 'Credit (Cr ₹)',
      flex: 1.3,
      minWidth: 110,
      render: (value: number) => {
        const val = Number(value || 0);
        return (
          <Text style={{ color: val > 0 ? '#16A34A' : theme.colors.textSecondary, fontWeight: val > 0 ? '700' : '400', fontSize: 13 }}>
            {val > 0 ? `+₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
          </Text>
        );
      },
    },
    {
      key: 'balance',
      title: 'Running Balance',
      flex: 1.5,
      minWidth: 120,
      render: (value: number) => {
        const val = Number(value || 0);
        return (
          <Text style={{ color: val >= 0 ? '#1E40AF' : '#DC2626', fontWeight: '700', fontSize: 13 }}>
            ₹{val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
          <Text style={[styles.title, { color: theme.colors.text }]}>Account Statement</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Chronological ledger transactions with debit, credit and running balance
          </Text>
        </View>

        <Pressable
          style={[styles.iconButton, { borderColor: theme.colors.border }]}
          onPress={() => refetch()}
        >
          <RefreshCw size={16} color={theme.colors.text} />
        </Pressable>
      </View>

      {/* Account Selector Horizontal Pills */}
      <View style={styles.accountSelectorWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountScroll}>
          {accounts.map((acc) => {
            const isSelected = selectedAccountId === acc.id;
            return (
              <Pressable
                key={acc.id}
                style={[
                  styles.accountPill,
                  isSelected
                    ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
                onPress={() => setSelectedAccountId(acc.id)}
              >
                <Text
                  style={[
                    styles.accountPillText,
                    { color: isSelected ? '#FFFFFF' : theme.colors.text },
                  ]}
                >
                  {acc.accountName} (₹{Number(acc.currentBalance || 0).toLocaleString('en-IN')})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Account Info Bar */}
      {selectedAccount && (
        <View style={[styles.infoBanner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.infoLeft}>
            <Building size={20} color={theme.colors.primary} />
            <View>
              <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
                {selectedAccount.accountName}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                {selectedAccount.bankName ? `${selectedAccount.bankName} • ` : ''}
                {selectedAccount.accountNumber ? `A/C: ${selectedAccount.accountNumber}` : selectedAccount.accountType}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Summary KPI Cards */}
      <View style={[styles.kpiContainer, isMobile && styles.kpiContainerMobile]}>
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#E0E7FF' }]}>
            <DollarSign size={20} color="#4F46E5" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Opening Balance</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
              ₹{summary.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#FEE2E2' }]}>
            <ArrowUpRight size={20} color="#DC2626" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Debits (Dr)</Text>
            <Text style={[styles.kpiValue, { color: '#DC2626' }]}>
              -₹{summary.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#DCFCE7' }]}>
            <ArrowDownLeft size={20} color="#16A34A" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Credits (Cr)</Text>
            <Text style={[styles.kpiValue, { color: '#16A34A' }]}>
              +₹{summary.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: summary.closingBalance >= 0 ? '#DCFCE7' : '#FEE2E2' }]}>
            <FileText size={20} color={summary.closingBalance >= 0 ? '#16A34A' : '#DC2626'} />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Closing Balance</Text>
            <Text
              style={[
                styles.kpiValue,
                { color: summary.closingBalance >= 0 ? '#16A34A' : '#DC2626' },
              ]}
            >
              ₹{summary.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Table */}
      <View style={styles.tableCard}>
        <AdvancedTable
          columns={columns}
          data={entries}
          isLoading={isLoading}
          searchPlaceholder="Search voucher or description..."
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
  iconButton: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountSelectorWrapper: {
    marginBottom: 12,
  },
  accountScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  accountPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  accountPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoTitle: {
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
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  tableCard: {
    flex: 1,
  },
});
