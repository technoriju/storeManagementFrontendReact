import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, Switch, Alert, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { useUnits, useAddUnit, useUpdateUnit, useDeleteUnit, Unit } from '../api/useUnit';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { useSyncStore } from '../../../core/sync/useSyncStore';
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

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

export const UnitListScreen = () => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();

  const { data: units = [], isLoading: isLoadingUnits, refetch } = useUnits();
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  useEffect(() => {
    if (lastSyncedAt) {
      refetch();
    }
  }, [lastSyncedAt, refetch]);
  const addMutation = useAddUnit();
  const updateMutation = useUpdateUnit();
  const deleteMutation = useDeleteUnit();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newShortName, setNewShortName] = useState('');
  const [newUnitStatus, setNewUnitStatus] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  const isSmallMobile = isMobile && windowWidth < 380;
  const actionIconSize = isMobile ? (isSmallMobile ? 14 : 15) : 16;
  const addBtnLabel = isSmallMobile ? 'Add' : (isMobile && windowWidth < 460 ? 'Add' : 'Add Unit');

  const columns = [
    { 
      key: 'name', 
      title: 'Unit', 
      flex: 2,
      minWidth: 150,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
    },
    { 
      key: 'shortName', 
      title: 'Short name', 
      flex: 1.5,
      minWidth: 100,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
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
    },
    { 
      key: 'syncStatus', 
      title: 'Sync', 
      width: 100,
      render: (value: string | undefined) => <SyncBadge status={value} />
    }
  ];

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
        style={[
          styles.iconButton, 
          isMobile && styles.iconButtonMobile,
          isSmallMobile && styles.iconButtonSmall,
          { borderColor: theme.colors.border }
        ]} 
        onPress={() => refetch()}
      >
        <RefreshCw size={actionIconSize} color={theme.colors.textSecondary} />
      </Pressable>
      {!isMobile && (
        <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
          <ChevronUp size={16} color={theme.colors.textSecondary} />
        </Pressable>
      )}
      <Pressable 
        style={[
          styles.primaryActionBtn, 
          { backgroundColor: '#F97316' },
          isMobile && styles.primaryActionBtnMobile,
          isSmallMobile && styles.primaryActionBtnSmall,
        ]} 
        onPress={() => {
          setEditingId(null);
          setNewUnitName('');
          setNewShortName('');
          setNewUnitStatus(true);
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

  const filters = (
    <View style={[styles.filtersWrapper, isMobile && styles.filtersWrapperMobile]}>
      <Pressable 
        style={[styles.filterDropdown, { borderColor: theme.colors.border }]}
        onPress={() => {
          setStatusFilter(prev => prev === 'All' ? 'Active' : prev === 'Active' ? 'Inactive' : 'All');
        }}
      >
        <Text style={{ color: theme.colors.text, fontSize: 13 }}>
          Status: {statusFilter}
        </Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 6 }} />
      </Pressable>
    </View>
  );

  const handleDelete = (item: any) => {
    const remove = () => deleteMutation.mutate(item.id);
    if (Platform.OS === 'web') {
      if ((globalThis as any).confirm(`Delete ${item.name}?`)) remove();
      return;
    }
    Alert.alert('Delete Unit', `Delete ${item.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
  };

  const renderRowActions = (item: any) => (
    <View style={styles.actionButtonsRow}>
      <Pressable
        onPress={() => {
          setEditingId(item.id);
          setNewUnitName(item.name);
          setNewShortName(item.shortName || '');
          setNewUnitStatus(item.status === 'Active');
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

  const renderUnitCard = (item: any) => {
    const isActive = String(item.status || '').toLowerCase() === 'active';
    return (
      <View style={[styles.mobileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardTopRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.unitBadgeRow}>
              <View style={[styles.shortNameBadge, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.shortNameText, { color: theme.colors.textSecondary }]}>
                  {item.shortName || '-'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: isActive ? '#10B981' : theme.colors.error }]}>
                <Text style={styles.statusBadgeText}>
                  {isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
          <SyncBadge status={item.syncStatus} />
        </View>

        <View style={[styles.cardBottomRow, { borderTopColor: theme.colors.divider }]}>
          <Text style={[styles.cardMeta, { color: theme.colors.textSecondary }]}>
            {formatDate(item.createdAt)}
          </Text>
          <View style={styles.cardActionsRow}>
            {renderRowActions(item)}
          </View>
        </View>
      </View>
    );
  };

  const handleSave = () => {
    if (!newUnitName || !newShortName) return;
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: newUnitName,
        shortName: newShortName,
        status: newUnitStatus ? 'Active' : 'Inactive',
      } as Unit, {
        onSuccess: () => {
          setNewUnitName('');
          setNewShortName('');
          setNewUnitStatus(true);
          setEditingId(null);
          setIsAddModalVisible(false);
        },
      });
    } else {
      addMutation.mutate({
        name: newUnitName,
        shortName: newShortName,
        status: newUnitStatus ? 'Active' : 'Inactive',
      }, {
        onSuccess: () => {
          setNewUnitName('');
          setNewShortName('');
          setNewUnitStatus(true);
          setIsAddModalVisible(false);
        },
      });
    }
  };

  const filteredUnits = units.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (u.shortName || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === 'All') return matchesSearch;
    return matchesSearch && (u.status?.toLowerCase() === statusFilter.toLowerCase());
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, padding: isMobile ? 8 : 16 }]}>
      <AdvancedTable
        title="Units"
        subtitle="Manage your units"
        headerActions={headerActions}
        columns={columns}
        data={filteredUnits}
        onSearch={setSearchQuery}
        filters={filters}
        renderRowActions={renderRowActions}
        renderMobileCard={renderUnitCard}
        isLoading={isLoadingUnits}
      />

      <AppDialog
        visible={isAddModalVisible}
        title={editingId ? "Edit Unit" : "Add Unit"}
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
              title={editingId ? "Save" : "Add Unit"} 
              onPress={handleSave} 
              style={[styles.dialogBtn, { backgroundColor: '#F97316' }]}
              disabled={addMutation.isPending || updateMutation.isPending}
              isLoading={addMutation.isPending || updateMutation.isPending}
            />
          </>
        }
      >
        <View style={{ gap: 16 }}>
          <AppInput
            label={
              <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
                Unit <Text style={{ color: theme.colors.error }}>*</Text>
              </Text>
            }
            value={newUnitName}
            onChangeText={setNewUnitName}
            placeholder="e.g. Kilogram"
          />
          <AppInput
            label={
              <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
                Short Name <Text style={{ color: theme.colors.error }}>*</Text>
              </Text>
            }
            value={newShortName}
            onChangeText={setNewShortName}
            placeholder="e.g. Kg"
          />
          <View style={styles.statusRow}>
            <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
              Status
            </Text>
            <Switch 
              value={newUnitStatus} 
              onValueChange={setNewUnitStatus} 
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
  filtersWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filtersWrapperMobile: {
    width: '100%',
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 38,
    backgroundColor: 'white',
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
    marginBottom: 6,
  },
  unitBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  shortNameBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  shortNameText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
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


