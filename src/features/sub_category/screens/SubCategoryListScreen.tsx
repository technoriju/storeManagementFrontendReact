import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, Switch, Alert, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { useSyncStore } from '../../../core/sync/useSyncStore';
import { AppDialog } from '../../../shared/components/feedback/AppDialog';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { useSubCategories, useAddSubCategory, useUpdateSubCategory, useDeleteSubCategory } from '../api/useSubCategory';
import { useCategories } from '../../category/api/useCategory';
import { RefreshCw, PlusCircle, Edit, Trash2, FileText, FileSpreadsheet } from 'lucide-react-native';

export const SubCategoryListScreen = () => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();
  
  const { data: subCategories = [], refetch, isLoading } = useSubCategories();
  const { data: categories = [] } = useCategories();
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  useEffect(() => {
    if (lastSyncedAt) {
      refetch();
    }
  }, [lastSyncedAt, refetch]);
  
  const addMutation = useAddSubCategory();
  const updateMutation = useUpdateSubCategory();
  const deleteMutation = useDeleteSubCategory();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const categoryOptions = categories.map(c => ({ label: c.name, value: c.id }));

  const isSmallMobile = isMobile && windowWidth < 380;
  const actionIconSize = isMobile ? (isSmallMobile ? 14 : 15) : 16;
  const addBtnLabel = isSmallMobile ? 'Add' : (isMobile && windowWidth < 460 ? 'Add' : 'Add Sub Category');

  const getCategoryName = (val: any) => {
    const cat = categories.find(c => Number(c.id) === Number(val) || (c.backendId && Number(c.backendId) === Number(val)));
    return cat ? cat.name : 'Unknown';
  };

  const columns = [
    { 
      key: 'name', 
      title: 'Sub Category', 
      flex: 2,
      minWidth: 150,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
    },
    { 
      key: 'categoryId', 
      title: 'Category', 
      flex: 2,
      minWidth: 150,
      render: (val: number) => {
        return <Text style={{ color: theme.colors.textSecondary }}>{getCategoryName(val)}</Text>;
      }
    },
    { 
      key: 'description', 
      title: 'Description', 
      flex: 2,
      minWidth: 150,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value || '-'}</Text>
    },
    { 
      key: 'status', 
      title: 'Status', 
      width: 90,
      render: (value: string) => (
        <View style={{ 
          backgroundColor: value === 'active' ? '#10B981' : '#EF4444', 
          paddingHorizontal: 8, 
          paddingVertical: 4, 
          borderRadius: 4, 
          alignSelf: 'flex-start' 
        }}>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>
            {value === 'active' ? 'Active' : 'Inactive'}
          </Text>
        </View>
      )
    },
    { 
      key: 'syncStatus', 
      title: 'Sync', 
      width: 100,
      render: (value: string | undefined) => <SyncBadge status={value} />
    }
  ];

  const handleSync = () => {
    import('../../../core/sync/SyncEngine').then(m => m.syncEngine.syncNow().then(() => refetch()));
  };

  const headerActions = (
    <View style={[styles.headerActionsWrapper, isMobile && styles.headerActionsWrapperMobile]}>
      {!isMobile && (
        <>
          <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
            <FileText size={16} color="#E11D48" />
          </Pressable>
          <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
            <FileSpreadsheet size={16} color="#10B981" />
          </Pressable>
        </>
      )}
      <Pressable 
        onPress={handleSync} 
        style={[
          styles.iconButton, 
          isMobile && styles.iconButtonMobile,
          isSmallMobile && styles.iconButtonSmall,
          { borderColor: theme.colors.border }
        ]}
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
          setEditingId(null);
          setName('');
          setCategoryId('');
          setDescription('');
          setStatus('active');
          setIsAddModalVisible(true);
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

  const handleDelete = (item: any) => {
    const remove = () => deleteMutation.mutate(item.id, {
      onError: (error: any) => Alert.alert('Error', error?.message || 'Failed to delete sub category'),
    });

    if (Platform.OS === 'web') {
      if ((globalThis as any).confirm(`Are you sure you want to delete ${item.name}?`)) remove();
      return;
    }

    Alert.alert(
      'Delete Sub Category',
      `Are you sure you want to delete ${item.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: remove },
      ],
    );
  };

  const renderRowActions = (item: any) => (
    <View style={styles.actionButtonsRow}>
      <Pressable 
        onPress={() => {
          setEditingId(item.id);
          setName(item.name);
          setCategoryId(item.categoryId);
          setDescription(item.description || '');
          setStatus(item.status || 'active');
          setIsAddModalVisible(true);
        }}
        style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}
      >
        <Edit size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable 
        onPress={() => handleDelete(item)}
        style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}
      >
        <Trash2 size={16} color={theme.colors.error} />
      </Pressable>
    </View>
  );

  const renderSubCategoryCard = (item: any) => {
    const isActive = item.status === 'active';
    return (
      <View style={[styles.mobileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardTopRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.categoryBadgeRow}>
              <View style={[styles.categoryBadge, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.categoryBadgeText, { color: theme.colors.textSecondary }]}>
                  {getCategoryName(item.categoryId)}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: isActive ? '#10B981' : '#EF4444' }]}>
                <Text style={styles.statusBadgeText}>
                  {isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            {item.description ? (
              <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>
          <SyncBadge status={item.syncStatus} />
        </View>

        <View style={[styles.cardBottomRow, { borderTopColor: theme.colors.divider }]}>
          <Text style={[styles.cardMeta, { color: theme.colors.textSecondary }]}>
            ID: #{item.id}
          </Text>
          <View style={styles.cardActionsRow}>
            {renderRowActions(item)}
          </View>
        </View>
      </View>
    );
  };

  const handleSave = () => {
    if (!name.trim() || !categoryId) {
      Alert.alert('Validation Error', 'Category and sub category name are required');
      return;
    }
    
    if (editingId) {
      const existing = subCategories.find(s => s.id === editingId);
      if (existing) {
        updateMutation.mutate(
          { ...existing, name, categoryId, description, status },
          {
            onSuccess: () => setIsAddModalVisible(false),
            onError: (error: any) => Alert.alert('Error', error?.message || 'Failed to update sub category'),
          },
        );
      }
    } else {
      addMutation.mutate(
        { name, categoryId, description, status },
        {
          onSuccess: () => setIsAddModalVisible(false),
          onError: (error: any) => Alert.alert('Error', error?.message || 'Failed to add sub category'),
        },
      );
    }
  };

  const filteredSubCategories = subCategories.filter(c => 
    (c.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (c.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, padding: isMobile ? 8 : 16 }]}>
      <AdvancedTable
        title="Sub Category"
        subtitle="Manage your sub categories"
        headerActions={headerActions}
        columns={columns}
        data={filteredSubCategories}
        isLoading={isLoading}
        onSearch={setSearchQuery}
        renderRowActions={renderRowActions}
        renderMobileCard={renderSubCategoryCard}
      />

      <AppDialog
        visible={isAddModalVisible}
        title={editingId ? "Edit Sub Category" : "Add Sub Category"}
        onClose={() => setIsAddModalVisible(false)}
        actions={
          <>
            <AppButton 
              title="Cancel" 
              variant="secondary" 
              onPress={() => setIsAddModalVisible(false)} 
              style={[styles.dialogBtn, { backgroundColor: '#0F172A' }]} 
            />
            <AppButton
              title="Save" 
              onPress={handleSave} 
              style={[styles.dialogBtn, { backgroundColor: '#F97316' }]} 
              disabled={addMutation.isPending || updateMutation.isPending}
              isLoading={addMutation.isPending || updateMutation.isPending}
            />
          </>
        }
      >
        <AppSelect
          label={
            <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
              Category <Text style={{ color: theme.colors.error }}>*</Text>
            </Text>
          }
          placeholder="Select Category"
          options={categoryOptions}
          value={categoryId}
          onSelect={setCategoryId}
        />
        
        <AppInput
          label={
            <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
              Sub Category Name <Text style={{ color: theme.colors.error }}>*</Text>
            </Text>
          }
          value={name}
          onChangeText={setName}
          placeholder="e.g. Laptops"
        />
        <AppInput
          label={<Text style={{ color: theme.colors.text, fontWeight: '500' }}>Description</Text>}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top' }}
          placeholder="Sub category description"
        />
        <View style={styles.statusRow}>
          <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
            Status
          </Text>
          <Switch 
            value={status === 'active'} 
            onValueChange={(val) => setStatus(val ? 'active' : 'inactive')} 
            trackColor={{ false: theme.colors.border, true: '#34D399' }}
            thumbColor={'#FFFFFF'}
          />
        </View>
      </AppDialog>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
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
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
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
  cardMeta: {
    fontSize: 12,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});


