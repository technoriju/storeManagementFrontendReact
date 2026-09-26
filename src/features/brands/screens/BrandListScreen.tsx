import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, Switch, Alert, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useBrands, useAddBrand, useUpdateBrand, useDeleteBrand, Brand } from '../api/useBrand';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { AppDialog } from '../../../shared/components/feedback/AppDialog';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { 
  FileText, 
  FileSpreadsheet, 
  RefreshCw, 
  ChevronUp, 
  PlusCircle, 
  Edit,
  Trash2,
  ChevronDown
} from 'lucide-react-native';

export const BrandListScreen = () => {
  const theme = useTheme();
  const { data: brands = [], isLoading, refetch } = useBrands();
  const addMutation = useAddBrand();
  const updateMutation = useUpdateBrand();
  const deleteMutation = useDeleteBrand();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandStatus, setNewBrandStatus] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  const columns = [
    { 
      key: 'name', 
      title: 'Brand', 
      flex: 2,
      minWidth: 150,
      render: (value: string) => (
        <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
      )
    },
    { 
      key: 'createdAt', 
      title: 'Created Date', 
      flex: 1.5,
      minWidth: 120,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
    },
    { 
      key: 'status', 
      title: 'Status', 
      width: 100,
      render: (value: string) => (
        <View style={{ 
          backgroundColor: value === 'Active' ? '#10B981' : theme.colors.error, 
          paddingHorizontal: 8, 
          paddingVertical: 4, 
          borderRadius: 4, 
          alignSelf: 'flex-start' 
        }}>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>• {value}</Text>
        </View>
      )
    }
  ];

  const headerActions = (
    <>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
        <FileText size={16} color="#E11D48" />
      </Pressable>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
        <FileSpreadsheet size={16} color="#10B981" />
      </Pressable>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]} onPress={() => refetch()}>
        <RefreshCw size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
        <ChevronUp size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable 
        style={[styles.primaryActionBtn, { backgroundColor: '#F97316' }]} 
        onPress={() => {
          setEditingId(null);
          setNewBrandName('');
          setNewBrandStatus(true);
          setIsAddModalVisible(true);
        }}
      >
        <PlusCircle size={16} color="white" />
        <Text style={styles.primaryActionText}>Add Brand</Text>
      </Pressable>
    </>
  );

  const filters = (
    <>
      <View style={[styles.filterDropdown, { borderColor: theme.colors.border, marginRight: 8 }]}>
        <Text style={{ color: theme.colors.text }}>Status</Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
      </View>
      <View style={[styles.filterDropdown, { borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.text }}>Sort By : Latest</Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
      </View>
    </>
  );

  const handleDelete = (item: any) => {
    const remove = () => deleteMutation.mutate(item.id);
    if (Platform.OS === 'web') {
      if ((globalThis as any).confirm(`Delete ${item.name}?`)) remove();
      return;
    }
    Alert.alert('Delete Brand', `Delete ${item.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
  };

  const renderRowActions = (item: any) => (
    <>
      <Pressable
        onPress={() => {
          setEditingId(item.id);
          setNewBrandName(item.name);
          setNewBrandStatus(item.status === 'Active');
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
    </>
  );

  const handleSave = () => {
    if (!newBrandName) return;
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: newBrandName,
        status: newBrandStatus ? 'Active' : 'Inactive',
      } as Brand, {
        onSuccess: () => {
          setNewBrandName('');
          setNewBrandStatus(true);
          setEditingId(null);
          setIsAddModalVisible(false);
        },
      });
    } else {
      addMutation.mutate({
        name: newBrandName,
        status: newBrandStatus ? 'Active' : 'Inactive',
      }, {
        onSuccess: () => {
          setNewBrandName('');
          setNewBrandStatus(true);
          setIsAddModalVisible(false);
        },
      });
    }
  };

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AdvancedTable
        title="Brand"
        subtitle="Manage your brands"
        headerActions={headerActions}
        columns={columns}
        data={filteredBrands}
        onSearch={setSearchQuery}
        filters={filters}
        renderRowActions={renderRowActions}
        isLoading={isLoading}
      />

      <AppDialog
        visible={isAddModalVisible}
        title={editingId ? "Edit Brand" : "Add Brand"}
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
              title={editingId ? "Save" : "Add Brand"} 
              onPress={handleSave} 
              style={{ backgroundColor: '#F97316', minWidth: 120 }} 
              disabled={addMutation.isPending || updateMutation.isPending}
            />
          </>
        }
      >
        <AppInput
          label={
            <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
              Brand <Text style={{ color: theme.colors.error }}>*</Text>
            </Text>
          }
          value={newBrandName}
          onChangeText={setNewBrandName}
        />
        <View style={styles.statusRow}>
          <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
            Status
          </Text>
          <Switch 
            value={newBrandStatus} 
            onValueChange={setNewBrandStatus} 
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
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: 'white',
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
});


