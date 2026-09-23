import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, TextInput, Switch } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { AppDialog } from '../../../shared/components/feedback/AppDialog';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { useSubCategories, useAddSubCategory, useUpdateSubCategory, useDeleteSubCategory } from '../api/useSubCategory';
import { useCategories } from '../../category/api/useCategory';
import { RefreshCw, PlusCircle, Edit, Trash2, FileText, FileSpreadsheet } from 'lucide-react-native';

export const SubCategoryListScreen = () => {
  const theme = useTheme();
  
  const { data: subCategories = [], refetch } = useSubCategories();
  const { data: categories = [] } = useCategories();
  
  const addMutation = useAddSubCategory();
  const updateMutation = useUpdateSubCategory();
  const deleteMutation = useDeleteSubCategory();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const categoryOptions = categories.map(c => ({ label: c.name, value: c.id }));

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
      render: (val: string) => {
        const cat = categories.find(c => c.id === val);
        return <Text style={{ color: theme.colors.textSecondary }}>{cat ? cat.name : 'Unknown'}</Text>;
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
      width: 90,
      render: (value: string) => (
        <View style={{ 
          backgroundColor: value === 'synced' ? '#3B82F6' : '#F59E0B', 
          paddingHorizontal: 8, 
          paddingVertical: 4, 
          borderRadius: 4, 
          alignSelf: 'flex-start' 
        }}>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>
            {value === 'synced' ? 'Synced' : 'Pending'}
          </Text>
        </View>
      )
    }
  ];

  const handleSync = () => {
    import('../../../core/sync/SyncEngine').then(m => m.syncEngine.syncNow().then(() => refetch()));
  };

  const headerActions = (
    <>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
        <FileText size={16} color="#E11D48" />
      </Pressable>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
        <FileSpreadsheet size={16} color="#10B981" />
      </Pressable>
      <Pressable onPress={handleSync} style={[styles.iconButton, { borderColor: theme.colors.border }]}>
        <RefreshCw size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable 
        style={[styles.primaryActionBtn, { backgroundColor: '#F97316' }]} 
        onPress={() => {
          setEditingId(null);
          setName('');
          setCategoryId('');
          setDescription('');
          setStatus('active');
          setIsAddModalVisible(true);
        }}
      >
        <PlusCircle size={16} color="white" />
        <Text style={styles.primaryActionText}>Add Sub Category</Text>
      </Pressable>
    </>
  );

  const renderRowActions = (item: any) => (
    <>
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
        onPress={() => deleteMutation.mutate(item.id)}
        style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}
      >
        <Trash2 size={16} color={theme.colors.error} />
      </Pressable>
    </>
  );

  const handleSave = () => {
    if (!name || !categoryId) return;
    
    if (editingId) {
      const existing = subCategories.find(s => s.id === editingId);
      if (existing) {
        updateMutation.mutate({
          ...existing,
          name,
          categoryId,
          description,
          status
        });
      }
    } else {
      addMutation.mutate({ name, categoryId, description, status });
    }
    
    setIsAddModalVisible(false);
  };

  const filteredSubCategories = subCategories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AdvancedTable
        title="Sub Category"
        subtitle="Manage your sub categories"
        headerActions={headerActions}
        columns={columns}
        data={filteredSubCategories}
        onSearch={setSearchQuery}
        renderRowActions={renderRowActions}
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
              style={{ backgroundColor: '#0F172A', minWidth: 100 }} 
            />
            <AppButton 
              title="Save" 
              onPress={handleSave} 
              style={{ backgroundColor: '#F97316', minWidth: 140 }} 
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
        />
        <AppInput
          label={<Text style={{ color: theme.colors.text, fontWeight: '500' }}>Description</Text>}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top' }}
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
  container: { flex: 1, padding: 16 },
  iconButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    marginRight: 8,
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
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
});
