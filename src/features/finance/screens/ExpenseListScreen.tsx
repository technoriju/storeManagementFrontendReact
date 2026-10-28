import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { useSyncStore } from '../../../core/sync/useSyncStore';
import { AppDialog } from '../../../shared/components/feedback/AppDialog';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { Expense } from '../../../types/models';
import {
  RefreshCw,
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  TrendingDown,
  Calendar,
  DollarSign,
  Tag,
  Filter,
} from 'lucide-react-native';
import {
  useExpenses,
  useAddExpense,
  useUpdateExpense,
  useDeleteExpense,
} from '../api/useExpenses';
import { useExpenseCategories } from '../api/useExpenseCategories';

export const ExpenseListScreen = () => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();

  const { data: expenses = [], isLoading, refetch } = useExpenses();
  const { data: categories = [] } = useExpenseCategories();
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  useEffect(() => {
    if (lastSyncedAt) {
      refetch();
    }
  }, [lastSyncedAt, refetch]);

  const addExpenseMutation = useAddExpense();
  const updateExpenseMutation = useUpdateExpense();
  const deleteExpenseMutation = useDeleteExpense();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form states
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const isSmallMobile = isMobile && windowWidth < 380;
  const actionIconSize = isMobile ? (isSmallMobile ? 14 : 15) : 16;
  const addBtnLabel = isSmallMobile ? 'Add' : isMobile ? 'Add Expense' : 'Add New Expense';

  // Calculate KPIs
  const kpis = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonthStr = new Date().toISOString().slice(0, 7);

    let total = 0;
    let thisMonth = 0;
    let today = 0;

    for (const exp of expenses) {
      const amt = Number(exp.amount) || 0;
      total += amt;
      const expDate = String(exp.date || exp.createdAt || '').slice(0, 10);
      if (expDate === todayStr) {
        today += amt;
      }
      if (expDate.startsWith(thisMonthStr)) {
        thisMonth += amt;
      }
    }

    return {
      total,
      thisMonth,
      today,
      count: expenses.length,
      average: expenses.length > 0 ? Math.round(total / expenses.length) : 0,
    };
  }, [expenses]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchesCategory =
        selectedCategory === 'ALL' ||
        (exp.category && exp.category.toLowerCase() === selectedCategory.toLowerCase());

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        (exp.category && exp.category.toLowerCase().includes(query)) ||
        (exp.description && exp.description.toLowerCase().includes(query)) ||
        (exp.reference && exp.reference.toLowerCase().includes(query)) ||
        String(exp.amount).includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [expenses, selectedCategory, searchQuery]);

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setAmount('');
    setCategory(categories[0]?.name || 'Rent & Lease');
    setDate(new Date().toISOString().slice(0, 10));
    setReference('');
    setDescription('');
    setFormError('');
    setIsModalVisible(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setAmount(String(exp.amount || ''));
    setCategory(exp.category || (categories[0]?.name || 'General'));
    setDate(exp.date ? String(exp.date).slice(0, 10) : new Date().toISOString().slice(0, 10));
    setReference(exp.reference || '');
    setDescription(exp.description || '');
    setFormError('');
    setIsModalVisible(true);
  };

  const handleOpenDetail = (exp: Expense) => {
    setSelectedExpense(exp);
    setIsDetailVisible(true);
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid expense amount greater than 0');
      return;
    }
    if (!category.trim()) {
      setFormError('Please select or specify a category');
      return;
    }

    try {
      if (editingExpense) {
        await updateExpenseMutation.mutateAsync({
          id: editingExpense.id,
          data: {
            amount: numAmount,
            category: category.trim(),
            date: date || new Date().toISOString().slice(0, 10),
            reference: reference.trim() || undefined,
            description: description.trim() || undefined,
          },
        });
      } else {
        await addExpenseMutation.mutateAsync({
          amount: numAmount,
          category: category.trim(),
          date: date || new Date().toISOString().slice(0, 10),
          reference: reference.trim() || undefined,
          description: description.trim() || undefined,
        });
      }
      setIsModalVisible(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save expense');
    }
  };

  const handleDelete = (exp: Expense) => {
    const confirmDelete = () => {
      deleteExpenseMutation.mutate(exp.id);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete this expense of ₹${exp.amount}?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Delete Expense',
        `Are you sure you want to delete this expense of ₹${exp.amount}?`,
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
      key: 'date',
      title: 'Date',
      flex: 1.2,
      minWidth: 100,
      render: (value: string | undefined, row: Expense) => {
        const d = value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
        return <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>{d}</Text>;
      },
    },
    {
      key: 'category',
      title: 'Category',
      flex: 1.5,
      minWidth: 130,
      render: (value: string) => (
        <View style={[styles.categoryBadge, { backgroundColor: '#FEE2E2' }]}>
          <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
            {value || 'General'}
          </Text>
        </View>
      ),
    },
    {
      key: 'reference',
      title: 'Reference',
      flex: 1.2,
      minWidth: 110,
      render: (value: string | undefined) => (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
          {value || '-'}
        </Text>
      ),
    },
    {
      key: 'description',
      title: 'Notes',
      flex: 2,
      minWidth: 150,
      render: (value: string | undefined) => (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
          {value || '-'}
        </Text>
      ),
    },
    {
      key: 'amount',
      title: 'Amount',
      flex: 1.2,
      minWidth: 110,
      render: (value: number) => (
        <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 14 }}>
          ₹{Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          <Text style={[styles.title, { color: theme.colors.text }]}>Expenses</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Track company expenditures, operational costs and outflow vouchers
          </Text>
        </View>
        {headerActions}
      </View>

      {/* KPI Summary Cards */}
      <View style={[styles.kpiContainer, isMobile && styles.kpiContainerMobile]}>
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.kpiIconWrapper}>
            <TrendingDown size={20} color="#DC2626" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Expenses</Text>
            <Text style={[styles.kpiValue, { color: '#DC2626' }]}>
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
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#F3E8FF' }]}>
            <DollarSign size={20} color="#7C3AED" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Today's Expense</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
              ₹{kpis.today.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#E0E7FF' }]}>
            <Tag size={20} color="#4F46E5" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Vouchers</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{kpis.count}</Text>
          </View>
        </View>
      </View>

      {/* Category Pills Filter */}
      <View style={styles.categoryFilterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          <Pressable
            style={[
              styles.filterPill,
              selectedCategory === 'ALL'
                ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={() => setSelectedCategory('ALL')}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: selectedCategory === 'ALL' ? '#FFFFFF' : theme.colors.text },
              ]}
            >
              All Categories ({expenses.length})
            </Text>
          </Pressable>

          {categories.map((cat) => {
            const count = expenses.filter(
              (e) => e.category && e.category.toLowerCase() === cat.name.toLowerCase()
            ).length;
            const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();

            return (
              <Pressable
                key={cat.id}
                style={[
                  styles.filterPill,
                  isSelected
                    ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
                onPress={() => setSelectedCategory(cat.name)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isSelected ? '#FFFFFF' : theme.colors.text },
                  ]}
                >
                  {cat.name} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Table */}
      <View style={styles.tableCard}>
        <AdvancedTable<Expense>
          columns={columns}
          data={filteredExpenses}
          searchPlaceholder="Search expense category, ref or notes..."
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          isLoading={isLoading}
          renderRowActions={(item: Expense) => (
            <View style={styles.actionsContainer}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
                onPress={() => handleOpenDetail(item)}
              >
                <Eye size={actionIconSize} color={theme.colors.textSecondary} />
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
        title={editingExpense ? 'Edit Expense' : 'Add New Expense'}
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
              title={editingExpense ? 'Update Expense' : 'Create Expense'}
              onPress={handleSave}
              isLoading={addExpenseMutation.isPending || updateExpenseMutation.isPending}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        }
      >
        <ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
          {formError ? <Text style={styles.errorBanner}>{formError}</Text> : null}

          <AppInput
            label="Amount (₹) *"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />

          <View style={{ marginBottom: theme.spacing.md }}>
            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  style={[
                    styles.selectablePill,
                    category === c.name
                      ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                      : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                  onPress={() => setCategory(c.name)}
                >
                  <Text style={{ color: category === c.name ? '#FFFFFF' : theme.colors.text, fontSize: 13 }}>
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <AppInput
              placeholder="Or enter custom category name"
              value={category}
              onChangeText={setCategory}
            />
          </View>

          <AppInput
            label="Expense Date (YYYY-MM-DD) *"
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
          />

          <AppInput
            label="Reference # (Optional)"
            placeholder="e.g. Receipt #1042, Bill-99"
            value={reference}
            onChangeText={setReference}
          />

          <AppInput
            label="Notes / Description"
            placeholder="Explain expense details..."
            multiline
            numberOfLines={3}
            style={{ height: 70 }}
            value={description}
            onChangeText={setDescription}
          />
        </ScrollView>
      </AppDialog>

      {/* Details Dialog */}
      <AppDialog
        visible={isDetailVisible}
        title="Expense Voucher Details"
        onClose={() => setIsDetailVisible(false)}
        actions={
          <AppButton
            title="Close"
            variant="outline"
            onPress={() => setIsDetailVisible(false)}
            style={{ width: '100%' }}
          />
        }
      >
        {selectedExpense && (
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Amount</Text>
              <Text style={[styles.detailVal, { color: '#DC2626', fontWeight: '700', fontSize: 18 }]}>
                ₹{Number(selectedExpense.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Category</Text>
              <Text style={[styles.detailVal, { color: theme.colors.text, fontWeight: '600' }]}>
                {selectedExpense.category}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Date</Text>
              <Text style={[styles.detailVal, { color: theme.colors.text }]}>
                {selectedExpense.date ? new Date(selectedExpense.date).toLocaleDateString('en-IN') : '-'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Reference</Text>
              <Text style={[styles.detailVal, { color: theme.colors.text }]}>
                {selectedExpense.reference || 'None'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Description</Text>
              <Text style={[styles.detailVal, { color: theme.colors.text }]}>
                {selectedExpense.description || 'No notes provided'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Sync Status</Text>
              <SyncBadge status={selectedExpense.syncStatus} />
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Voucher ID</Text>
              <Text style={[styles.detailVal, { color: theme.colors.textSecondary }]}>
                EXP-{String(selectedExpense.id).replace('-', 'TMP-')}
              </Text>
            </View>
          </View>
        )}
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
    minWidth: 120,
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
    backgroundColor: '#FEE2E2',
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
  categoryFilterRow: {
    marginBottom: 12,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryBadge: {
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
    maxHeight: 450,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectablePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
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
  detailCard: {
    gap: 10,
    paddingVertical: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  detailKey: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailVal: {
    fontSize: 14,
    maxWidth: '65%',
    textAlign: 'right',
  },
});
