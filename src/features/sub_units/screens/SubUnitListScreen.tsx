import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, Switch, Alert, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useSubUnits, useAddSubUnit, useUpdateSubUnit, useDeleteSubUnit, SubUnit } from '../api/useSubUnit';
import { useUnits as useUnitList } from '../../units/api/useUnit';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { AppDialog } from '../../../shared/components/feedback/AppDialog';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
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

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

export const SubUnitListScreen = () => {
  const theme = useTheme();
  const { data: subUnits = [], isLoading: isLoadingSubUnits, refetch } = useSubUnits();
  const { data: units = [] } = useUnitList();
  const addMutation = useAddSubUnit();
  const updateMutation = useUpdateSubUnit();
  const deleteMutation = useDeleteSubUnit();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newParentUnitId, setNewParentUnitId] = useState<number | ''>('');
  const [newSubUnitName, setNewSubUnitName] = useState('');
  const [newMultiplier, setNewMultiplier] = useState('');
  const [newSubUnitStatus, setNewSubUnitStatus] = useState(true);

  const unitOptions = units.map(u => ({ label: u.name, value: u.id }));

  const columns = [
    { 
      key: 'name', 
      title: 'Sub Unit', 
      flex: 1.5,
      minWidth: 120,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
    },
    { 
      key: 'multiplier', 
      title: 'Conversion', 
      flex: 1.5,
      minWidth: 150,
      render: (value: number, item: any) => {
        const parent = units.find(u => String(u.id) === String(item?.parentUnitId) || (u.backendId && String(u.backendId) === String(item?.parentUnitId)));
        if (!parent) return <Text style={{ color: theme.colors.textSecondary }}>-</Text>;
        return <Text style={{ color: theme.colors.textSecondary, fontWeight: '500' }}>1 {parent.name} = {value || 1} {item.name}</Text>;
      }
    },
    { 
      key: 'parentUnitId', 
      title: 'Parent Unit', 
      flex: 1.5,
      minWidth: 120,
      render: (value: number) => {
        const parent = units.find(u => String(u.id) === String(value) || (u.backendId && String(u.backendId) === String(value)));
        return <Text style={{ color: theme.colors.textSecondary }}>{parent ? parent.name : '-'}</Text>;
      }
    },
    { 
      key: 'createdAt', 
      title: 'Created Date', 
      flex: 1.5,
      minWidth: 120,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{formatDate(value)}</Text>
    },
    { 
      key: 'status', 
      title: 'Status', 
      width: 100,
      render: (value: string) => {
        const isActive = String(value || '').toLowerCase() === 'active';
        return (
          <View style={{ 
            backgroundColor: isActive ? '#10B981' : theme.colors.error, 
            paddingHorizontal: 8, 
            paddingVertical: 4, 
            borderRadius: 4, 
            alignSelf: 'flex-start' 
          }}>
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>• {value || (isActive ? 'Active' : 'Inactive')}</Text>
          </View>
        );
      }
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
          setNewParentUnitId('');
          setNewSubUnitName('');
          setNewMultiplier('');
          setNewSubUnitStatus(true);
          setIsAddModalVisible(true);
        }}
      >
        <PlusCircle size={16} color="white" />
        <Text style={styles.primaryActionText}>Add Sub Unit</Text>
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
    Alert.alert('Delete Sub Unit', `Delete ${item.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
  };

  const renderRowActions = (item: any) => (
    <>
      <Pressable
        onPress={() => {
          setEditingId(item.id);
          setNewParentUnitId(item.parentUnitId !== undefined && item.parentUnitId !== null && item.parentUnitId !== '' ? Number(item.parentUnitId) : '');
          setNewSubUnitName(item.name || '');
          setNewMultiplier(item.multiplier ? String(item.multiplier) : '1');
          setNewSubUnitStatus(String(item.status || '').toLowerCase() === 'active');
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
    if (!newParentUnitId || !newSubUnitName || !newMultiplier) return;
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        parentUnitId: Number(newParentUnitId),
        name: newSubUnitName.trim(),
        multiplier: Number(newMultiplier) || 1,
        status: newSubUnitStatus ? 'Active' : 'Inactive',
      } as SubUnit, {
        onSuccess: () => {
          setNewParentUnitId('');
          setNewSubUnitName('');
          setNewMultiplier('');
          setNewSubUnitStatus(true);
          setEditingId(null);
          setIsAddModalVisible(false);
        },
        onError: (err: any) => {
          Alert.alert('Error', err?.message || 'Failed to update sub unit');
        }
      });
    } else {
      addMutation.mutate({
        parentUnitId: Number(newParentUnitId),
        name: newSubUnitName.trim(),
        multiplier: Number(newMultiplier) || 1,
        status: newSubUnitStatus ? 'Active' : 'Inactive',
      }, {
        onSuccess: () => {
          setNewParentUnitId('');
          setNewSubUnitName('');
          setNewMultiplier('');
          setNewSubUnitStatus(true);
          setIsAddModalVisible(false);
        },
        onError: (err: any) => {
          Alert.alert('Error', err?.message || 'Failed to add sub unit');
        }
      });
    }
  };

  const filteredSubUnits = subUnits.filter(su => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const parent = units.find(u => String(u.id) === String(su.parentUnitId) || (u.backendId && String(u.backendId) === String(su.parentUnitId)));
    const parentName = parent ? parent.name : '';
    return (su.name || '').toLowerCase().includes(query) || parentName.toLowerCase().includes(query);
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AdvancedTable
        title="Sub Units"
        subtitle="Manage your sub units"
        headerActions={headerActions}
        columns={columns}
        data={filteredSubUnits}
        isLoading={isLoadingSubUnits}
        onSearch={setSearchQuery}
        filters={filters}
        renderRowActions={renderRowActions}
      />

      <AppDialog
        visible={isAddModalVisible}
        title={editingId ? "Edit Sub Unit" : "Add Sub Unit"}
        onClose={() => {
          setIsAddModalVisible(false);
          setEditingId(null);
        }}
        actions={
          <>
            <AppButton 
              title="Cancel" 
              variant="secondary" 
              onPress={() => {
                setIsAddModalVisible(false);
                setEditingId(null);
              }} 
              style={{ backgroundColor: '#0F172A', minWidth: 100 }} 
            />
            <AppButton 
              title={editingId ? "Save" : "Add Sub Unit"} 
              onPress={handleSave} 
              style={{ backgroundColor: '#F97316', minWidth: 120 }}
              disabled={addMutation.isPending || updateMutation.isPending}
            />
          </>
        }
      >
        <View style={{ gap: 16, minHeight: 300 }}>
          <AppSelect
            label={
              <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
                Parent Unit <Text style={{ color: theme.colors.error }}>*</Text>
              </Text>
            }
            placeholder="Select Parent Unit"
            options={unitOptions}
            value={newParentUnitId}
            onSelect={setNewParentUnitId}
            searchable={true}
          />
          <AppInput
            label={
              <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
                Sub Unit Name <Text style={{ color: theme.colors.error }}>*</Text>
              </Text>
            }
            value={newSubUnitName}
            onChangeText={setNewSubUnitName}
            placeholder="e.g. Gram"
          />
                    <AppInput
            label={
              <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
                Multiplier <Text style={{ color: theme.colors.error }}>*</Text>
              </Text>
            }
            value={newMultiplier}
            onChangeText={setNewMultiplier}
            placeholder="e.g. 100 (1 Parent = 100 Sub Unit)"
            keyboardType="numeric"
          />
          <View style={styles.statusRow}>
            <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
              Status
            </Text>
            <Switch 
              value={newSubUnitStatus} 
              onValueChange={setNewSubUnitStatus} 
              trackColor={{ false: theme.colors.border, true: '#34D399' }}
              thumbColor={'#FFFFFF'}
            />
          </View>
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





