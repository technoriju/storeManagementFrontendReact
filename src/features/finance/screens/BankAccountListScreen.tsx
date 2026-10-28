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
import { BankAccount } from '../../../types/models';
import {
  RefreshCw,
  PlusCircle,
  Edit,
  Trash2,
  Briefcase,
  DollarSign,
  Building,
  CreditCard,
  FileText,
} from 'lucide-react-native';
import {
  useBankAccounts,
  useAddBankAccount,
  useUpdateBankAccount,
  useDeleteBankAccount,
} from '../api/useBankAccounts';

interface BankAccountListScreenProps {
  onNavigateTab?: (tab: string, params?: any) => void;
}

export const BankAccountListScreen: React.FC<BankAccountListScreenProps> = ({ onNavigateTab }) => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();

  const { data: accounts = [], isLoading, refetch } = useBankAccounts();
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  useEffect(() => {
    if (lastSyncedAt) {
      refetch();
    }
  }, [lastSyncedAt, refetch]);

  const addAccountMutation = useAddBankAccount();
  const updateAccountMutation = useUpdateBankAccount();
  const deleteAccountMutation = useDeleteBankAccount();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  // Form states
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountType, setAccountType] = useState<'BANK' | 'CASH'>('BANK');
  const [openingBalance, setOpeningBalance] = useState('');
  const [formError, setFormError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const isSmallMobile = isMobile && windowWidth < 380;
  const actionIconSize = isMobile ? (isSmallMobile ? 14 : 15) : 16;
  const addBtnLabel = isSmallMobile ? 'Add' : isMobile ? 'Add Account' : 'Add Bank / Cash Account';

  // KPI calculations
  const kpis = useMemo(() => {
    let totalLiquidity = 0;
    let bankBalance = 0;
    let cashBalance = 0;

    for (const a of accounts) {
      const bal = Number(a.currentBalance || 0);
      totalLiquidity += bal;
      if (a.accountType === 'CASH') {
        cashBalance += bal;
      } else {
        bankBalance += bal;
      }
    }

    return {
      totalLiquidity,
      bankBalance,
      cashBalance,
      totalCount: accounts.length,
    };
  }, [accounts]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      const matchesType =
        selectedType === 'ALL' ||
        (a.accountType && a.accountType.toUpperCase() === selectedType.toUpperCase());

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (a.accountName && a.accountName.toLowerCase().includes(q)) ||
        (a.bankName && a.bankName.toLowerCase().includes(q)) ||
        (a.accountNumber && a.accountNumber.toLowerCase().includes(q));

      return matchesType && matchesSearch;
    });
  }, [accounts, selectedType, searchQuery]);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setAccountName('');
    setAccountNumber('');
    setBankName('');
    setBranchName('');
    setIfscCode('');
    setAccountType('BANK');
    setOpeningBalance('0');
    setFormError('');
    setIsModalVisible(true);
  };

  const handleOpenEdit = (acc: BankAccount) => {
    setEditingAccount(acc);
    setAccountName(acc.accountName || '');
    setAccountNumber(acc.accountNumber || '');
    setBankName(acc.bankName || '');
    setBranchName(acc.branchName || '');
    setIfscCode(acc.ifscCode || '');
    setAccountType(acc.accountType === 'CASH' ? 'CASH' : 'BANK');
    setOpeningBalance(String(acc.openingBalance ?? 0));
    setFormError('');
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!accountName.trim()) {
      setFormError('Account name is required');
      return;
    }

    const opBal = parseFloat(openingBalance);
    if (isNaN(opBal)) {
      setFormError('Please enter a valid numeric opening balance');
      return;
    }

    try {
      if (editingAccount) {
        await updateAccountMutation.mutateAsync({
          id: editingAccount.id,
          data: {
            accountName: accountName.trim(),
            accountNumber: accountNumber.trim() || undefined,
            bankName: bankName.trim() || undefined,
            branchName: branchName.trim() || undefined,
            ifscCode: ifscCode.trim() || undefined,
            accountType,
            openingBalance: opBal,
          },
        });
      } else {
        await addAccountMutation.mutateAsync({
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim() || undefined,
          bankName: bankName.trim() || undefined,
          branchName: branchName.trim() || undefined,
          ifscCode: ifscCode.trim() || undefined,
          accountType,
          openingBalance: opBal,
        });
      }
      setIsModalVisible(false);
    } catch (e: any) {
      setFormError(e?.message || 'Failed to save account');
    }
  };

  const handleDelete = (acc: BankAccount) => {
    const confirmDelete = () => {
      deleteAccountMutation.mutate(acc.id);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete "${acc.accountName}"?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Delete Account',
        `Are you sure you want to delete "${acc.accountName}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirmDelete },
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
      key: 'accountName',
      title: 'Account Name',
      flex: 2,
      minWidth: 150,
      render: (value: string, row: BankAccount) => (
        <View>
          <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 14 }}>
            {value}
          </Text>
          {row.bankName && (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
              {row.bankName} {row.branchName ? `(${row.branchName})` : ''}
            </Text>
          )}
        </View>
      ),
    },
    {
      key: 'accountType',
      title: 'Type',
      width: 100,
      render: (value: string | undefined) => {
        const isCash = value === 'CASH';
        return (
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: isCash ? '#FEF3C7' : '#E0E7FF' },
            ]}
          >
            <Text
              style={{
                color: isCash ? '#D97706' : '#4F46E5',
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              {isCash ? 'CASH' : 'BANK'}
            </Text>
          </View>
        );
      },
    },
    {
      key: 'accountNumber',
      title: 'Account #',
      flex: 1.5,
      minWidth: 120,
      render: (value: string | undefined) => (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
          {value || '-'}
        </Text>
      ),
    },
    {
      key: 'currentBalance',
      title: 'Current Balance',
      flex: 1.5,
      minWidth: 130,
      render: (value: number) => {
        const num = Number(value || 0);
        return (
          <Text
            style={{
              color: num >= 0 ? '#16A34A' : '#DC2626',
              fontWeight: '700',
              fontSize: 14,
            }}
          >
            ₹{num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        );
      },
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
          <Text style={[styles.title, { color: theme.colors.text }]}>Bank & Cash Accounts</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Manage business bank accounts, cash in hand and liquid ledgers
          </Text>
        </View>
        {headerActions}
      </View>

      {/* KPI Cards */}
      <View style={[styles.kpiContainer, isMobile && styles.kpiContainerMobile]}>
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#DCFCE7' }]}>
            <DollarSign size={20} color="#16A34A" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Liquidity</Text>
            <Text style={[styles.kpiValue, { color: '#16A34A' }]}>
              ₹{kpis.totalLiquidity.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#E0E7FF' }]}>
            <Building size={20} color="#4F46E5" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Bank Balance</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
              ₹{kpis.bankBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#FEF3C7' }]}>
            <CreditCard size={20} color="#D97706" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Cash in Hand</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
              ₹{kpis.cashBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#F3E8FF' }]}>
            <Briefcase size={20} color="#7C3AED" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Accounts</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{kpis.totalCount}</Text>
          </View>
        </View>
      </View>

      {/* Type Filter Pills */}
      <View style={styles.filterRow}>
        {['ALL', 'BANK', 'CASH'].map((t) => {
          const isSelected = selectedType === t;
          return (
            <Pressable
              key={t}
              style={[
                styles.filterPill,
                isSelected
                  ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                  : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
              onPress={() => setSelectedType(t)}
            >
              <Text style={{ color: isSelected ? '#FFFFFF' : theme.colors.text, fontSize: 12, fontWeight: '600' }}>
                {t === 'ALL' ? 'All Accounts' : t === 'BANK' ? 'Bank Accounts' : 'Cash Drawers'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Main Table */}
      <View style={styles.tableCard}>
        <AdvancedTable<BankAccount>
          columns={columns}
          data={filteredAccounts}
          searchPlaceholder="Search account by name, bank or account number..."
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          isLoading={isLoading}
          renderRowActions={(item: BankAccount) => (
            <View style={styles.actionsContainer}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
                onPress={() => onNavigateTab && onNavigateTab('account_statement', { accountId: item.id })}
              >
                <FileText size={actionIconSize} color={theme.colors.textSecondary} />
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
                onPress={() => handleOpenEdit(item)}
              >
                <Edit size={actionIconSize} color={theme.colors.primary} />
              </Pressable>
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

      {/* Add / Edit Dialog */}
      <AppDialog
        visible={isModalVisible}
        title={editingAccount ? 'Edit Account' : 'Add Bank / Cash Account'}
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
              title={editingAccount ? 'Update Account' : 'Create Account'}
              onPress={handleSave}
              isLoading={addAccountMutation.isPending || updateAccountMutation.isPending}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        }
      >
        <ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
          {formError ? <Text style={styles.errorBanner}>{formError}</Text> : null}

          {/* Account Type Toggle */}
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Account Type *</Text>
            <View style={styles.toggleRow}>
              <Pressable
                style={[
                  styles.toggleBtn,
                  accountType === 'BANK'
                    ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
                onPress={() => setAccountType('BANK')}
              >
                <Text style={{ color: accountType === 'BANK' ? '#FFFFFF' : theme.colors.text, fontWeight: '600', fontSize: 13 }}>
                  Bank Account
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.toggleBtn,
                  accountType === 'CASH'
                    ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
                onPress={() => setAccountType('CASH')}
              >
                <Text style={{ color: accountType === 'CASH' ? '#FFFFFF' : theme.colors.text, fontWeight: '600', fontSize: 13 }}>
                  Cash / Petty Drawer
                </Text>
              </Pressable>
            </View>
          </View>

          <AppInput
            label="Account Title / Display Name *"
            placeholder={accountType === 'BANK' ? 'e.g. HDFC Main Operating' : 'e.g. Cash in Register #1'}
            value={accountName}
            onChangeText={setAccountName}
          />

          {accountType === 'BANK' && (
            <>
              <AppInput
                label="Bank Name"
                placeholder="e.g. HDFC Bank, SBI, ICICI"
                value={bankName}
                onChangeText={setBankName}
              />

              <AppInput
                label="Account Number"
                placeholder="e.g. 5010023948291"
                value={accountNumber}
                onChangeText={setAccountNumber}
              />

              <AppInput
                label="Branch / IFSC Code"
                placeholder="e.g. HDFC0001234, MG Road"
                value={ifscCode}
                onChangeText={setIfscCode}
              />
            </>
          )}

          <AppInput
            label="Opening Balance (₹)"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={openingBalance}
            onChangeText={setOpeningBalance}
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
    minWidth: 140,
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tableCard: {
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
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
    maxHeight: 450,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
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
