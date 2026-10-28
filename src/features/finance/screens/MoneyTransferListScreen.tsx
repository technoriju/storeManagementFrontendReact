import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { useSyncStore } from '../../../core/sync/useSyncStore';
import { AppDialog } from '../../../shared/components/feedback/AppDialog';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { MoneyTransfer } from '../../../types/models';
import {
  RefreshCw,
  PlusCircle,
  Trash2,
  ArrowRightLeft,
  Calendar,
  DollarSign,
  TrendingUp,
} from 'lucide-react-native';
import {
  useMoneyTransfers,
  useAddMoneyTransfer,
  useDeleteMoneyTransfer,
} from '../api/useMoneyTransfers';
import { useBankAccounts } from '../api/useBankAccounts';

export const MoneyTransferListScreen = () => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();

  const { data: transfers = [], isLoading, refetch } = useMoneyTransfers();
  const { data: accounts = [] } = useBankAccounts();
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  useEffect(() => {
    if (lastSyncedAt) {
      refetch();
    }
  }, [lastSyncedAt, refetch]);

  const addTransferMutation = useAddMoneyTransfer();
  const deleteTransferMutation = useDeleteMoneyTransfer();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Form states
  const [fromAccountId, setFromAccountId] = useState<number | null>(null);
  const [toAccountId, setToAccountId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const isSmallMobile = isMobile && windowWidth < 380;
  const actionIconSize = isMobile ? (isSmallMobile ? 14 : 15) : 16;
  const addBtnLabel = isSmallMobile ? 'Transfer' : isMobile ? 'Transfer Money' : 'New Money Transfer';

  // KPI calculations
  const kpis = useMemo(() => {
    const thisMonthStr = new Date().toISOString().slice(0, 7);
    let total = 0;
    let thisMonth = 0;

    for (const t of transfers) {
      const amt = Number(t.amount || 0);
      total += amt;
      const d = String(t.transferDate || t.createdAt || '').slice(0, 7);
      if (d === thisMonthStr) {
        thisMonth += amt;
      }
    }

    return {
      total,
      thisMonth,
      count: transfers.length,
    };
  }, [transfers]);

  const filteredTransfers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return transfers;
    return transfers.filter(
      (t) =>
        (t.fromAccountName && t.fromAccountName.toLowerCase().includes(q)) ||
        (t.toAccountName && t.toAccountName.toLowerCase().includes(q)) ||
        (t.reference && t.reference.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        String(t.amount).includes(q)
    );
  }, [transfers, searchQuery]);

  const handleOpenAdd = () => {
    if (accounts.length < 2) {
      Alert.alert('Accounts Needed', 'You need at least 2 bank or cash accounts to transfer money.');
      return;
    }
    setFromAccountId(accounts[0]?.id || null);
    setToAccountId(accounts[1]?.id || null);
    setAmount('');
    setTransferDate(new Date().toISOString().slice(0, 10));
    setReference('');
    setDescription('');
    setFormError('');
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!fromAccountId || !toAccountId) {
      setFormError('Please select both From Account and To Account');
      return;
    }
    if (fromAccountId === toAccountId) {
      setFormError('Source and Destination accounts cannot be the same');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid transfer amount greater than 0');
      return;
    }

    const fromAcc = accounts.find((a) => a.id === fromAccountId);
    const toAcc = accounts.find((a) => a.id === toAccountId);

    try {
      await addTransferMutation.mutateAsync({
        fromAccountId,
        toAccountId,
        fromAccountName: fromAcc?.accountName || `Account #${fromAccountId}`,
        toAccountName: toAcc?.accountName || `Account #${toAccountId}`,
        amount: numAmount,
        transferDate: transferDate || new Date().toISOString().slice(0, 10),
        reference: reference.trim() || undefined,
        description: description.trim() || undefined,
      });
      setIsModalVisible(false);
    } catch (e: any) {
      setFormError(e?.message || 'Failed to execute transfer');
    }
  };

  const handleDelete = (t: MoneyTransfer) => {
    const confirmDelete = () => {
      deleteTransferMutation.mutate(t.id);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Cancel / reverse this transfer of ₹${t.amount}?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Cancel Transfer',
        `Cancel and reverse this transfer of ₹${t.amount}?`,
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes, Reverse', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { syncEngine } = await import('../../../core/sync/SyncEngine');
      await syncEngine.syncNow();
      await refetch();
    } catch (e) {
      console.warn('Sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const columns = [
    {
      key: 'transferDate',
      title: 'Date',
      flex: 1.2,
      minWidth: 100,
      render: (value: string | undefined) => {
        const d = value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
        return <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>{d}</Text>;
      },
    },
    {
      key: 'fromAccountName',
      title: 'From Account',
      flex: 1.8,
      minWidth: 140,
      render: (value: string) => (
        <View style={[styles.accountPill, { backgroundColor: '#FEE2E2' }]}>
          <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
            {value}
          </Text>
        </View>
      ),
    },
    {
      key: 'toAccountName',
      title: 'To Account',
      flex: 1.8,
      minWidth: 140,
      render: (value: string) => (
        <View style={[styles.accountPill, { backgroundColor: '#DCFCE7' }]}>
          <Text style={{ color: '#16A34A', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
            {value}
          </Text>
        </View>
      ),
    },
    {
      key: 'amount',
      title: 'Amount',
      flex: 1.3,
      minWidth: 110,
      render: (value: number) => (
        <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 14 }}>
          ₹{Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      key: 'reference',
      title: 'Ref / Cheque #',
      flex: 1.3,
      minWidth: 110,
      render: (value: string | undefined) => (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
          {value || '-'}
        </Text>
      ),
    },
    {
      key: 'syncStatus',
      title: 'Sync',
      width: 90,
      render: (value: string | undefined) => <SyncBadge status={value} />,
    },
  ];

  const headerActions = (
    <View style={[styles.headerActionsWrapper, isMobile && styles.headerActionsWrapperMobile]}>
      <Pressable
        style={[
          styles.iconButton,
          isMobile && styles.iconButtonMobile,
          isSmallMobile && styles.iconButtonSmall,
          { borderColor: theme.colors.border },
        ]}
        onPress={handleSync}
        disabled={isSyncing}
      >
        <RefreshCw size={actionIconSize} color={theme.colors.text} style={isSyncing ? styles.rotating : undefined} />
      </Pressable>

      <AppButton
        title={addBtnLabel}
        size={isMobile ? 'small' : 'medium'}
        onPress={handleOpenAdd}
        style={styles.addButton}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Money Transfer</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Contra entries between bank accounts, cash drawers and liquid funds
          </Text>
        </View>
        {headerActions}
      </View>

      {/* KPI Cards */}
      <View style={[styles.kpiContainer, isMobile && styles.kpiContainerMobile]}>
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#E0E7FF' }]}>
            <ArrowRightLeft size={20} color="#4F46E5" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Transferred</Text>
            <Text style={[styles.kpiValue, { color: '#4F46E5' }]}>
              ₹{kpis.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#FEF3C7' }]}>
            <Calendar size={20} color="#D97706" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>This Month</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
              ₹{kpis.thisMonth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#DCFCE7' }]}>
            <TrendingUp size={20} color="#16A34A" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Transfers</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{kpis.count}</Text>
          </View>
        </View>
      </View>

      {/* Main Table */}
      <View style={styles.tableCard}>
        <AdvancedTable<MoneyTransfer>
          columns={columns}
          data={filteredTransfers}
          searchPlaceholder="Search transfer by account, ref or note..."
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          isLoading={isLoading}
          renderRowActions={(item: MoneyTransfer) => (
            <View style={styles.actionsContainer}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
                onPress={() => handleDelete(item)}
              >
                <Trash2 size={actionIconSize} color="#DC2626" />
              </Pressable>
            </View>
          )}
        />
      </View>

      {/* Add Transfer Dialog */}
      <AppDialog
        visible={isModalVisible}
        title="New Money Transfer (Contra Entry)"
        onClose={() => setIsModalVisible(false)}
        actions={
          <View style={styles.modalActions}>
            <AppButton
              title="Cancel"
              variant="outline"
              onPress={() => setIsModalVisible(false)}
              style={{ flex: 1, marginRight: 8 }}
            />
            <AppButton
              title="Execute Transfer"
              onPress={handleSave}
              isLoading={addTransferMutation.isPending}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        }
      >
        <ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
          {formError ? <Text style={styles.errorBanner}>{formError}</Text> : null}

          {/* From Account */}
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Transfer From (Source) *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
              {accounts.map((a) => (
                <Pressable
                  key={a.id}
                  style={[
                    styles.accountSelectPill,
                    fromAccountId === a.id
                      ? { backgroundColor: '#DC2626', borderColor: '#DC2626' }
                      : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                  onPress={() => setFromAccountId(a.id)}
                >
                  <Text style={{ color: fromAccountId === a.id ? '#FFFFFF' : theme.colors.text, fontSize: 13, fontWeight: '600' }}>
                    {a.accountName} (₹{Number(a.currentBalance || 0).toLocaleString('en-IN')})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* To Account */}
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Transfer To (Destination) *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
              {accounts.map((a) => (
                <Pressable
                  key={a.id}
                  style={[
                    styles.accountSelectPill,
                    toAccountId === a.id
                      ? { backgroundColor: '#16A34A', borderColor: '#16A34A' }
                      : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                  onPress={() => setToAccountId(a.id)}
                >
                  <Text style={{ color: toAccountId === a.id ? '#FFFFFF' : theme.colors.text, fontSize: 13, fontWeight: '600' }}>
                    {a.accountName} (₹{Number(a.currentBalance || 0).toLocaleString('en-IN')})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <AppInput
            label="Amount (₹) *"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />

          <AppInput
            label="Date (YYYY-MM-DD) *"
            placeholder="YYYY-MM-DD"
            value={transferDate}
            onChangeText={setTransferDate}
          />

          <AppInput
            label="Reference # / Cheque # / Txn ID"
            placeholder="e.g. CHQ-99120, IMPS-49124"
            value={reference}
            onChangeText={setReference}
          />

          <AppInput
            label="Description / Reason"
            placeholder="e.g. Cash withdrawal from bank, Petty cash replenishment"
            multiline
            numberOfLines={2}
            style={{ height: 60 }}
            value={description}
            onChangeText={setDescription}
          />
        </ScrollView>
      </AppDialog>
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
  headerActionsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionsWrapperMobile: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  iconButton: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonMobile: {
    padding: 6,
  },
  iconButtonSmall: {
    padding: 4,
  },
  addButton: {
    minWidth: 130,
  },
  rotating: {
    transform: [{ rotate: '45deg' }],
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
    fontSize: 17,
    fontWeight: '700',
    marginTop: 2,
  },
  accountPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  tableCard: {
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
  },
  dialogScroll: {
    maxHeight: 460,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountSelectPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  errorBanner: {
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '500',
  },
});
