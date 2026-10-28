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
import { Income } from '../../../types/models';
import {
  RefreshCw,
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  Calendar,
  DollarSign,
  Tag,
  FilePlus,
} from 'lucide-react-native';
import {
  useIncomes,
  useAddIncome,
  useUpdateIncome,
  useDeleteIncome,
} from '../api/useIncomes';
import { useIncomeCategories } from '../api/useIncomeCategories';

export const IncomeListScreen = () => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();

  const { data: incomes = [], isLoading, refetch } = useIncomes();
  const { data: categories = [] } = useIncomeCategories();
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  useEffect(() => {
    if (lastSyncedAt) {
      refetch();
    }
  }, [lastSyncedAt, refetch]);

  const addIncomeMutation = useAddIncome();
  const updateIncomeMutation = useUpdateIncome();
  const deleteIncomeMutation = useDeleteIncome();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

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
  const addBtnLabel = isSmallMobile ? 'Add' : isMobile ? 'Add Income' : 'Add New Income';

  // Calculate KPIs
  const kpis = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonthStr = new Date().toISOString().slice(0, 7);

    let total = 0;
    let thisMonth = 0;
    let today = 0;

    for (const inc of incomes) {
      const amt = Number(inc.amount) || 0;
      total += amt;
      const incDate = String(inc.date || inc.createdAt || '').slice(0, 10);
      if (incDate === todayStr) {
        today += amt;
      }
      if (incDate.startsWith(thisMonthStr)) {
        thisMonth += amt;
      }
    }

    return {
      total,
      thisMonth,
      today,
      count: incomes.length,
      average: incomes.length > 0 ? Math.round(total / incomes.length) : 0,
    };
  }, [incomes]);

  // Filtered incomes
  const filteredIncomes = useMemo(() => {
    return incomes.filter((inc) => {
      const matchesCategory =
        selectedCategory === 'ALL' ||
        (inc.category && inc.category.toLowerCase() === selectedCategory.toLowerCase());

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        (inc.category && inc.category.toLowerCase().includes(query)) ||
        (inc.description && inc.description.toLowerCase().includes(query)) ||
        (inc.reference && inc.reference.toLowerCase().includes(query)) ||
        String(inc.amount).includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [incomes, selectedCategory, searchQuery]);

  const handleOpenAdd = () => {
    setEditingIncome(null);
    setAmount('');
    setCategory(categories[0]?.name || 'Service Revenue');
    setDate(new Date().toISOString().slice(0, 10));
    setReference('');
    setDescription('');
    setFormError('');
    setIsModalVisible(true);
  };

  const handleOpenEdit = (inc: Income) => {
    setEditingIncome(inc);
    setAmount(String(inc.amount || ''));
    setCategory(inc.category || (categories[0]?.name || 'General'));
    setDate(inc.date ? String(inc.date).slice(0, 10) : new Date().toISOString().slice(0, 10));
    setReference(inc.reference || '');
    setDescription(inc.description || '');
    setFormError('');
    setIsModalVisible(true);
  };

  const handleOpenDetail = (inc: Income) => {
    setSelectedIncome(inc);
    setIsDetailVisible(true);
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid income amount greater than 0');
      return;
    }
    if (!category.trim()) {
      setFormError('Please select or specify a category');
      return;
    }

    try {
      if (editingIncome) {
        await updateIncomeMutation.mutateAsync({
          id: editingIncome.id,
          data: {
            amount: numAmount,
            category: category.trim(),
            date: date || new Date().toISOString().slice(0, 10),
            reference: reference.trim() || undefined,
            description: description.trim() || undefined,
          },
        });
      } else {
        await addIncomeMutation.mutateAsync({
          amount: numAmount,
          category: category.trim(),
          date: date || new Date().toISOString().slice(0, 10),
          reference: reference.trim() || undefined,
          description: description.trim() || undefined,
        });
      }
      setIsModalVisible(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save income');
    }
  };

  const handleDelete = (inc: Income) => {
    const confirmDelete = () => {
      deleteIncomeMutation.mutate(inc.id);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete this income entry of ₹${inc.amount}?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Delete Income',
        `Are you sure you want to delete this income entry of ₹${inc.amount}?`,
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
      render: (value: string | undefined) => {
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
        <View style={[styles.categoryBadge, { backgroundColor: '#DCFCE7' }]}>
          <Text style={{ color: '#16A34A', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
            {value || 'General'}
          </Text>
        </View>
      ),
    },
    {
      key: 'reference',
      title: 'Reference / Txn',
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
      title: 'Description',
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
        <Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 14 }}>
          +₹{Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          <Text style={[styles.title, { color: theme.colors.text }]}>Income</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Track company revenue, consultations, service fees and inflow vouchers
          </Text>
        </View>
        {headerActions}
      </View>

      {/* KPI Summary Cards */}
      <View style={[styles.kpiContainer, isMobile && styles.kpiContainerMobile]}>
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#DCFCE7' }]}>
            <TrendingUp size={20} color="#16A34A" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Income</Text>
            <Text style={[styles.kpiValue, { color: '#16A34A' }]}>
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
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#E0E7FF' }]}>
            <DollarSign size={20} color="#4F46E5" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Today's Inflow</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
              ₹{kpis.today.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#F3E8FF' }]}>
            <Tag size={20} color="#7C3AED" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Receipts</Text>
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
              All Categories ({incomes.length})
            </Text>
          </Pressable>

          {categories.map((cat) => {
            const count = incomes.filter(
              (i) => i.category && i.category.toLowerCase() === cat.name.toLowerCase()
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
        <AdvancedTable<Income>
          columns={columns}
          data={filteredIncomes}
          searchPlaceholder="Search income category, reference or description..."
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          isLoading={isLoading}
          renderRowActions={(item: Income) => (
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
        title={editingIncome ? 'Edit Income Voucher' : 'Add New Income'}
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
              title={editingIncome ? 'Update Income' : 'Create Income'}
              onPress={handleSave}
              isLoading={addIncomeMutation.isPending || updateIncomeMutation.isPending}
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
              placeholder="Or enter custom income category"
              value={category}
              onChangeText={setCategory}
            />
          </View>

          <AppInput
            label="Income Date (YYYY-MM-DD) *"
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
          />

          <AppInput
            label="Reference # / Transaction ID (Optional)"
            placeholder="e.g. UPI-992384, NEFT-4819, Slip #11"
            value={reference}
            onChangeText={setReference}
          />

          <AppInput
            label="Description / Notes"
            placeholder="Explain revenue source details..."
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
        title="Income Voucher Details"
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
        {selectedIncome && (
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Amount</Text>
              <Text style={[styles.detailVal, { color: '#16A34A', fontWeight: '700', fontSize: 18 }]}>
                +₹{Number(selectedIncome.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Category</Text>
              <Text style={[styles.detailVal, { color: theme.colors.text, fontWeight: '600' }]}>
                {selectedIncome.category}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Date</Text>
              <Text style={[styles.detailVal, { color: theme.colors.text }]}>
                {selectedIncome.date ? new Date(selectedIncome.date).toLocaleDateString('en-IN') : '-'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Reference / Txn</Text>
              <Text style={[styles.detailVal, { color: theme.colors.text }]}>
                {selectedIncome.reference || 'None'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Description</Text>
              <Text style={[styles.detailVal, { color: theme.colors.text }]}>
                {selectedIncome.description || 'No notes provided'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Sync Status</Text>
              <SyncBadge status={selectedIncome.syncStatus} />
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: theme.colors.textSecondary }]}>Voucher ID</Text>
              <Text style={[styles.detailVal, { color: theme.colors.textSecondary }]}>
                INC-{String(selectedIncome.id).replace('-', 'TMP-')}
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
