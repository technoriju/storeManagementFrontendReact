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
import { ExpenseCategory } from '../../../types/models';
import {
  RefreshCw,
  PlusCircle,
  Edit,
  Trash2,
  FolderMinus,
  CheckCircle,
  FileMinus,
} from 'lucide-react-native';
import {
  useExpenseCategories,
  useAddExpenseCategory,
  useUpdateExpenseCategory,
  useDeleteExpenseCategory,
} from '../api/useExpenseCategories';
import { useExpenses } from '../api/useExpenses';

export const ExpenseCategoryListScreen = () => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();

  const { data: categories = [], isLoading, refetch } = useExpenseCategories();
  const { data: expenses = [] } = useExpenses();
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  useEffect(() => {
    if (lastSyncedAt) {
      refetch();
    }
  }, [lastSyncedAt, refetch]);

  const addCategoryMutation = useAddExpenseCategory();
  const updateCategoryMutation = useUpdateExpenseCategory();
  const deleteCategoryMutation = useDeleteExpenseCategory();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const isSmallMobile = isMobile && windowWidth < 380;
  const actionIconSize = isMobile ? (isSmallMobile ? 14 : 15) : 16;
  const addBtnLabel = isSmallMobile ? 'Add' : isMobile ? 'Add Category' : 'Add Expense Category';

  const categoryUsageMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const exp of expenses) {
      if (exp.category) {
        const key = exp.category.toLowerCase();
        map.set(key, (map.get(key) || 0) + 1);
      }
    }
    return map;
  }, [expenses]);

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.description && c.description.toLowerCase().includes(query))
    );
  }, [categories, searchQuery]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setFormError('');
    setIsModalVisible(true);
  };

  const handleOpenEdit = (cat: ExpenseCategory) => {
    setEditingCategory(cat);
    setName(cat.name || '');
    setDescription(cat.description || '');
    setFormError('');
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError('Category name is required');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          id: editingCategory.id,
          data: {
            name: name.trim(),
            description: description.trim() || undefined,
          },
        });
      } else {
        await addCategoryMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
        });
      }
      setIsModalVisible(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save expense category');
    }
  };

  const handleDelete = (cat: ExpenseCategory) => {
    const confirmDelete = () => {
      deleteCategoryMutation.mutate(cat.id);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete expense category "${cat.name}"?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Delete Category',
        `Delete expense category "${cat.name}"?`,
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
      key: 'name',
      title: 'Category Name',
      flex: 2,
      minWidth: 140,
      render: (value: string) => (
        <View style={styles.nameCell}>
          <View style={[styles.bullet, { backgroundColor: '#DC2626' }]} />
          <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 14 }}>
            {value}
          </Text>
        </View>
      ),
    },
    {
      key: 'description',
      title: 'Description',
      flex: 3,
      minWidth: 180,
      render: (value: string | undefined) => (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
          {value || '-'}
        </Text>
      ),
    },
    {
      key: 'id',
      title: 'Vouchers Tied',
      flex: 1.2,
      minWidth: 110,
      render: (_: any, row: ExpenseCategory) => {
        const count = categoryUsageMap.get((row.name || '').toLowerCase()) || 0;
        return (
          <View style={[styles.countBadge, { backgroundColor: '#FEE2E2' }]}>
            <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700' }}>
              {count} voucher{count === 1 ? '' : 's'}
            </Text>
          </View>
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
          <Text style={[styles.title, { color: theme.colors.text }]}>Expense Categories</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Manage classification tags for overheads, rent, salaries and operational expenses
          </Text>
        </View>
        {headerActions}
      </View>

      {/* KPI Cards */}
      <View style={[styles.kpiContainer, isMobile && styles.kpiContainerMobile]}>
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#FEE2E2' }]}>
            <FolderMinus size={20} color="#DC2626" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Categories</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{categories.length}</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#DCFCE7' }]}>
            <CheckCircle size={20} color="#16A34A" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Active Classes</Text>
            <Text style={[styles.kpiValue, { color: '#16A34A' }]}>{categories.length}</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: '#FEF3C7' }]}>
            <FileMinus size={20} color="#D97706" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Expenses</Text>
            <Text style={[styles.kpiValue, { color: '#D97706' }]}>{expenses.length}</Text>
          </View>
        </View>
      </View>

      {/* Main Table */}
      <View style={styles.tableCard}>
        <AdvancedTable<ExpenseCategory>
          columns={columns}
          data={filteredCategories}
          searchPlaceholder="Search expense category by name or note..."
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          isLoading={isLoading}
          renderRowActions={(item: ExpenseCategory) => (
            <View style={styles.actionsContainer}>
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
        title={editingCategory ? 'Edit Expense Category' : 'Add Expense Category'}
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
              title={editingCategory ? 'Update Category' : 'Create Category'}
              onPress={handleSave}
              isLoading={addCategoryMutation.isPending || updateCategoryMutation.isPending}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        }
      >
        <ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
          {formError ? <Text style={styles.errorBanner}>{formError}</Text> : null}

          <AppInput
            label="Category Name *"
            placeholder="e.g. Electricity & Power, Rent, Staff Welfare"
            value={name}
            onChangeText={setName}
          />

          <AppInput
            label="Description / Purpose"
            placeholder="Optional notes about what goes into this category..."
            multiline
            numberOfLines={3}
            style={{ height: 75 }}
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
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  tableCard: {
    flex: 1,
  },
  nameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  countBadge: {
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
    maxHeight: 350,
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
