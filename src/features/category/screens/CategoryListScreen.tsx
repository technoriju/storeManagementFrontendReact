import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { useSyncStore } from '../../../core/sync/useSyncStore';
import { AppDialog } from '../../../shared/components/feedback/AppDialog';
import { FormErrorBanner } from '../../../shared/components/feedback/FormErrorBanner';
import { formatApiErrorMessage } from '../../../shared/utils/errorUtils';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { Category } from '../../../types/models';
import { 
  RefreshCw, 
  PlusCircle, 
  Edit, 
  Trash2
} from 'lucide-react-native';
import { 
  useCategories, 
  useAddCategory, 
  useUpdateCategory, 
  useDeleteCategory 
} from '../api/useCategory';

export const CategoryListScreen = () => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();

  const { data: categories = [], isLoading, error, refetch } = useCategories();
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  useEffect(() => {
    if (lastSyncedAt) {
      refetch();
    }
  }, [lastSyncedAt, refetch]);

  const addCategoryMutation = useAddCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isSmallMobile = isMobile && windowWidth < 380;
  const actionIconSize = isMobile ? (isSmallMobile ? 14 : 15) : 16;
  const addBtnLabel = isSmallMobile ? 'Add' : (isMobile && windowWidth < 460 ? 'Add' : 'Add Category');

  const columns = [
    { 
      key: 'name', 
      title: 'Category', 
      flex: 2,
      minWidth: 150,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
    },
    { 
      key: 'description', 
      title: 'Description', 
      flex: 3,
      minWidth: 200,
      render: (value: string | undefined) => (
        <Text style={{ color: theme.colors.textSecondary }} numberOfLines={1}>
          {value || '-'}
        </Text>
      )
    },
    { 
      key: 'syncStatus', 
      title: 'Sync', 
      width: 100,
      render: (value: string | undefined) => <SyncBadge status={value} />
    },
    { 
      key: 'createdAt', 
      title: 'Created On', 
      flex: 1.5,
      minWidth: 120,
      render: (value: string | undefined) => {
        const date = value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
        return <Text style={{ color: theme.colors.textSecondary }}>{date}</Text>;
      }
    }
  ];

  const headerActions = (
    <View style={[styles.headerActionsWrapper, isMobile && styles.headerActionsWrapperMobile]}>
      <Pressable 
        style={[
          styles.iconButton, 
          isMobile && styles.iconButtonMobile,
          isSmallMobile && styles.iconButtonSmall,
          { borderColor: theme.colors.border }
        ]} 
        onPress={() => { import('../../../core/sync/SyncEngine').then(m => m.syncEngine.syncNow().then(() => refetch())); }}
      >
        <RefreshCw size={actionIconSize} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable 
        style={[
          styles.primaryActionBtn, 
          { backgroundColor: '#F97316' },
          isMobile && styles.primaryActionBtnMobile,
          isSmallMobile && styles.primaryActionBtnSmall,
        ]} 
        onPress={() => {
          setEditingCategory(null);
          setCategoryName('');
          setCategoryDescription('');
          setFormError(null);
          setIsModalVisible(true);
        }}
      >
        <PlusCircle size={actionIconSize} color="white" />
        <Text style={[
          styles.primaryActionText,
          isMobile && styles.primaryActionTextMobile,
        ]}>
          {addBtnLabel}
        </Text>
      </Pressable>
    </View>
  );

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setFormError(null);
    setIsModalVisible(true);
  };

  const handleDelete = (category: Category) => {
    const deleteCategory = () => {
      deleteCategoryMutation.mutate(category, {
        onError: (e: any) => {
          Alert.alert('Error', e.message || 'Failed to delete category');
        }
      });
    };

    if (Platform.OS === 'web') {
      if ((globalThis as any).confirm(`Are you sure you want to delete ${category.name}?`)) {
        deleteCategory();
      }
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete ${category.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: deleteCategory
        }
      ]
    );
  };

  const renderRowActions = (item: Category) => (
    <View style={styles.actionButtonsRow}>
      <Pressable 
        style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}
        onPress={() => handleEdit(item)}
      >
        <Edit size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable 
        style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}
        onPress={() => handleDelete(item)}
      >
        <Trash2 size={16} color={theme.colors.error} />
      </Pressable>
    </View>
  );

  const renderCategoryCard = (category: Category) => {
    const date = category.createdAt
      ? new Date(category.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-';

    return (
      <View style={[styles.mobileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardTopRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {category.name}
            </Text>
            {category.description ? (
              <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {category.description}
              </Text>
            ) : null}
          </View>
          <SyncBadge status={category.syncStatus} />
        </View>

        <View style={[styles.cardBottomRow, { borderTopColor: theme.colors.divider }]}>
          <Text style={[styles.cardDate, { color: theme.colors.textSecondary }]}>
            {date}
          </Text>
          <View style={styles.cardActionsRow}>
            {renderRowActions(category)}
          </View>
        </View>
      </View>
    );
  };

  const handleSaveCategory = () => {
    if (!categoryName.trim()) {
      setFormError('Category name is required');
      return;
    }
    setFormError(null);
    
    if (editingCategory) {
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        data: {
          name: categoryName.trim(),
          description: categoryDescription.trim(),
        }
      }, {
        onSuccess: () => {
          setIsModalVisible(false);
          setFormError(null);
        },
        onError: (e: any) => {
          setFormError(formatApiErrorMessage(e, 'Failed to update category'));
        }
      });
    } else {
      addCategoryMutation.mutate({
        name: categoryName.trim(),
        description: categoryDescription.trim(),
      }, {
        onSuccess: () => {
          setIsModalVisible(false);
          setFormError(null);
        },
        onError: (e: any) => {
          setFormError(formatApiErrorMessage(e, 'Failed to add category'));
        }
      });
    }
  };

  const categoryList = Array.isArray(categories) ? categories : [];
  const filteredCategories = categoryList.filter((c: Category) => {
    const name = c?.name || '';
    const desc = c?.description || '';
    const search = searchQuery?.toLowerCase() || '';
    return name.toLowerCase().includes(search) || desc.toLowerCase().includes(search);
  });

  const isSaving = addCategoryMutation.isPending || updateCategoryMutation.isPending;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, padding: isMobile ? 8 : 16 }]}>
      {isLoading && !isModalVisible ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={{ color: theme.colors.error, marginBottom: 16 }}>
            {error instanceof Error ? error.message : 'Error fetching categories'}
          </Text>
          <AppButton title="Retry" onPress={() => refetch()} style={{ backgroundColor: '#F97316' }} />
        </View>
      ) : (
        <AdvancedTable
          title="Category"
          subtitle="Manage your categories"
          headerActions={headerActions}
          columns={columns}
          data={filteredCategories}
          onSearch={setSearchQuery}
          renderRowActions={renderRowActions}
          renderMobileCard={renderCategoryCard}
        />
      )}

      <AppDialog
        visible={isModalVisible}
        title={editingCategory ? "Edit Category" : "Add Category"}
        onClose={() => {
          setIsModalVisible(false);
          setFormError(null);
        }}
        actions={
          <>
            <AppButton 
              title="Cancel" 
              variant="secondary" 
              onPress={() => {
                setIsModalVisible(false);
                setFormError(null);
              }} 
              style={[styles.dialogBtn, { backgroundColor: '#0F172A' }]} 
            />
            <AppButton 
              title={editingCategory ? "Save Changes" : "Add Category"} 
              onPress={handleSaveCategory} 
              style={[styles.dialogBtn, { backgroundColor: '#F97316' }]}
              disabled={isSaving}
              isLoading={isSaving}
            />
          </>
        }
      >
        <FormErrorBanner message={formError} />
        <AppInput
          label={
            <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
              Category Name <Text style={{ color: theme.colors.error }}>*</Text>
            </Text>
          }
          value={categoryName}
          onChangeText={(val: string) => {
            setCategoryName(val);
            if (formError) setFormError(null);
          }}
          placeholder="e.g. Computers"
        />
        <AppInput
          label={
            <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
              Description
            </Text>
          }
          value={categoryDescription}
          onChangeText={(val: string) => {
            setCategoryDescription(val);
            if (formError) setFormError(null);
          }}
          placeholder="Category description"
        />
      </AppDialog>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerActionsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionsWrapperMobile: {
    gap: 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  iconButtonMobile: {
    width: 32,
    height: 32,
  },
  iconButtonSmall: {
    width: 28,
    height: 28,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 6,
    gap: 8,
  },
  primaryActionBtnMobile: {
    paddingHorizontal: 10,
    height: 32,
    gap: 4,
  },
  primaryActionBtnSmall: {
    paddingHorizontal: 8,
    height: 28,
  },
  primaryActionText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  primaryActionTextMobile: {
    fontSize: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowActionBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  dialogBtn: {
    minWidth: 110,
    height: 40,
    borderRadius: 6,
  },
  // Mobile Card styles
  mobileCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 8,
  },
  cardDate: {
    fontSize: 12,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});


