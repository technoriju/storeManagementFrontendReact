import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { AppDialog } from '../../../shared/components/feedback/AppDialog';
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

  const { data: categories = [], isLoading, error, refetch } = useCategories();
  const addCategoryMutation = useAddCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');

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
      title: 'Status', 
      flex: 1.5,
      minWidth: 100,
      render: (value: string | undefined) => {
        const isOnline = value === 'synced';
        return (
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: isOnline ? '#DCFCE7' : '#FEF3C7',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
            alignSelf: 'flex-start'
          }}>
            <View style={{ 
              width: 6, 
              height: 6, 
              borderRadius: 3, 
              backgroundColor: isOnline ? '#16A34A' : '#D97706',
              marginRight: 6 
            }} />
            <Text style={{ 
              color: isOnline ? '#16A34A' : '#D97706',
              fontSize: 12,
              fontWeight: '500'
            }}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        );
      }
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
    <>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]} onPress={() => { import('../../../core/sync/SyncEngine').then(m => m.syncEngine.syncNow().then(() => refetch())); }}>
        <RefreshCw size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable 
        style={[styles.primaryActionBtn, { backgroundColor: '#F97316' }]} 
        onPress={() => {
          setEditingCategory(null);
          setCategoryName('');
          setCategoryDescription('');
          setIsModalVisible(true);
        }}
      >
        <PlusCircle size={16} color="white" />
        <Text style={styles.primaryActionText}>Add Category</Text>
      </Pressable>
    </>
  );

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setIsModalVisible(true);
  };

  const handleDelete = (category: Category) => {
    const deleteCategory = () => {
      deleteCategoryMutation.mutate(category.id, {
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
    <>
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
    </>
  );

  const handleSaveCategory = () => {
    if (!categoryName.trim()) {
      Alert.alert('Validation Error', 'Category name is required');
      return;
    }
    
    if (editingCategory) {
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        data: {
          name: categoryName,
          description: categoryDescription,
        }
      }, {
        onSuccess: () => setIsModalVisible(false),
        onError: (e: any) => Alert.alert('Error', e.message || 'An error occurred')
      });
    } else {
      addCategoryMutation.mutate({
        name: categoryName,
        description: categoryDescription,
      }, {
        onSuccess: () => setIsModalVisible(false),
        onError: (e: any) => Alert.alert('Error', e.message || 'An error occurred')
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
        />
      )}

      <AppDialog
        visible={isModalVisible}
        title={editingCategory ? "Edit Category" : "Add Category"}
        onClose={() => setIsModalVisible(false)}
        actions={
          <>
            <AppButton 
              title="Cancel" 
              variant="secondary" 
              onPress={() => setIsModalVisible(false)} 
              style={{ backgroundColor: '#0F172A', minWidth: 100 }} 
            />
            <AppButton 
              title={editingCategory ? "Save Changes" : "Add Category"} 
              onPress={handleSaveCategory} 
              style={{ backgroundColor: '#F97316', minWidth: 120 }}
              disabled={isSaving}
            />
          </>
        }
      >
        <AppInput
          label={
            <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
              Category Name <Text style={{ color: theme.colors.error }}>*</Text>
            </Text>
          }
          value={categoryName}
          onChangeText={setCategoryName}
          placeholder="e.g. Computers"
        />
        <AppInput
          label={
            <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
              Description
            </Text>
          }
          value={categoryDescription}
          onChangeText={setCategoryDescription}
          placeholder="Category description"
        />
        {isSaving && <ActivityIndicator style={{ marginTop: 16 }} color="#F97316" />}
      </AppDialog>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 6,
    gap: 8,
  },
  primaryActionText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  rowActionBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    marginRight: 8,
  }
});


