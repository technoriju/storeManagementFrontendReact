import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { CustomerScreenType } from '../CustomersModule';
import { useCustomers, useAddCustomer, useUpdateCustomer, useDeleteCustomer } from '../api/useCustomer';
import { Customer } from '../../../types/models';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
import { useSyncStore } from '../../../core/sync/useSyncStore';
import { 
  FileText, 
  FileSpreadsheet, 
  RefreshCw, 
  ChevronUp, 
  PlusCircle, 
  Eye, 
  Edit, 
  Trash2, 
  ChevronDown,
  Phone,
  Mail,
  User,
  X,
} from 'lucide-react-native';

interface Props {
  onNavigate: (screen: CustomerScreenType, customerId?: string | number) => void;
}

export const CustomerListScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();
  const { data: customers = [], isLoading, refetch } = useCustomers();
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  useEffect(() => {
    if (lastSyncedAt) {
      refetch();
    }
  }, [lastSyncedAt, refetch]);

  const addMutation = useAddCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredCustomers = useMemo(() => {
    let list = customers;
    if (statusFilter) {
      list = list.filter((c: any) => {
        const raw = String(c.status || 'Active').toUpperCase();
        const isInactive = raw === 'INACTIVE' || raw === 'DISABLED';
        return statusFilter === 'ACTIVE' ? !isInactive : isInactive;
      });
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((c: any) =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.customerName && c.customerName.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, searchQuery, statusFilter]);

  const columns = [
    { 
      key: 'code', 
      title: 'Code', 
      width: 100,
      render: (value: any, item: any) => {
        const code = `CU${String((String(item.id).charCodeAt(0) || 0) % 999).padStart(3, '0')}`;
        return <Text style={{ color: theme.colors.textSecondary }}>{code}</Text>;
      }
    },
    { 
      key: 'name', 
      title: 'Customer', 
      flex: 2,
      minWidth: 200,
      render: (value: any, item: any) => {
        const displayName =
          value ||
          item?.name ||
          item?.customerName ||
          item?.fullName ||
          (item?.firstName ? `${item.firstName} ${item.lastName || ''}`.trim() : '') ||
          (item?.id ? `Customer #${item.id}` : 'Customer');
        return <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{displayName}</Text>;
      }
    },
    { 
      key: 'email', 
      title: 'Email', 
      flex: 1.5,
      minWidth: 150,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value || 'N/A'}</Text>
    },
    { 
      key: 'phone', 
      title: 'Phone', 
      flex: 1,
      minWidth: 120,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value || 'N/A'}</Text>
    },
    { 
      key: 'country', 
      title: 'Country', 
      flex: 1,
      minWidth: 100,
      render: (value: string, item: any) => {
        const country = item.address?.split(',').pop()?.trim() || 'N/A';
        return <Text style={{ color: theme.colors.textSecondary }}>{country}</Text>;
      }
    },
    { 
      key: 'outstandingBalance', 
      title: 'Due Balance', 
      width: 130,
      render: (value: any, item: any) => {
        const bal = Number(value !== undefined && value !== null ? value : item?.outstandingBalance || 0);
        const color = bal > 0 ? '#EF4444' : bal < 0 ? '#10B981' : theme.colors.textSecondary;
        return (
          <Text style={{ color, fontWeight: '700' }}>
            ₹{bal.toFixed(2)}
          </Text>
        );
      }
    },
    { 
      key: 'status', 
      title: 'Status', 
      width: 110,
      render: (value: any, item: any) => {
        const rawStatus = String(value || item?.status || 'Active').toUpperCase();
        const isInactive = rawStatus === 'INACTIVE' || rawStatus === 'DISABLED';
        const color = isInactive ? '#EF4444' : '#10B981';
        const bg = isInactive ? '#FEF2F2' : '#ECFDF5';
        const label = isInactive ? 'Inactive' : 'Active';
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: bg, borderColor: color, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginRight: 6 }} />
            <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{label}</Text>
          </View>
        );
      }
    },
    { 
      key: 'syncStatus', 
      title: 'Sync', 
      width: 100,
      render: (value: string | undefined) => <SyncBadge status={value} />
    }
  ];

  const isSmallMobile = isMobile && windowWidth < 380;
  const actionIconSize = isMobile ? (isSmallMobile ? 14 : 15) : 16;
  const addBtnLabel = !isMobile ? 'Add Customer' : (windowWidth >= 480 ? 'Add Customer' : 'Add');

  const headerActions = (
    <View style={[
      styles.headerActionsWrapper,
      isMobile && styles.headerActionsWrapperMobile,
      isSmallMobile && styles.headerActionsWrapperSmall,
    ]}>
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
      <Pressable 
        style={[
          styles.primaryActionBtn, 
          { backgroundColor: '#F97316' },
          isMobile && styles.primaryActionBtnMobile,
          isSmallMobile && styles.primaryActionBtnSmall,
        ]} 
        onPress={() => onNavigate('form')}
      >
        <PlusCircle size={actionIconSize} color="white" />
        <Text style={[
          styles.primaryActionText,
          isMobile && styles.primaryActionTextMobile,
          isSmallMobile && styles.primaryActionTextSmall,
        ]}>{addBtnLabel}</Text>
      </Pressable>
    </View>
  );

  const statusOptions = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  const filters = (
    <View style={[styles.filtersWrapper, isMobile && { width: '100%' }]}>
      <AppSelect
        placeholder="Customer Status"
        value={statusFilter}
        options={statusOptions}
        onSelect={(val) => setStatusFilter(val ? String(val) : '')}
        clearable
        containerStyle={[
          styles.filterSelect,
          isMobile ? { flex: 1, minWidth: 0 } : { width: 160 }
        ]}
      />
      {!!statusFilter && (
        <Pressable
          style={[styles.clearFilterBtn, { borderColor: theme.colors.border }]}
          onPress={() => setStatusFilter('')}
        >
          <X size={14} color="#EF4444" />
          <Text style={styles.clearFilterText}>Reset</Text>
        </Pressable>
      )}
    </View>
  );

  const handleDelete = (item: any) => {
    const remove = () => deleteMutation.mutate(item.id);
    if (Platform.OS === 'web') {
      if ((globalThis as any).confirm(`Delete ${item.name}?`)) remove();
      return;
    }
    Alert.alert('Delete Customer', `Delete ${item.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
  };

  const renderRowActions = (item: any) => (
    <>
      <Pressable style={[styles.rowActionBtn, { borderColor: theme.colors.border }]} onPress={() => onNavigate('details', item.id)}>
        <Eye size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable style={[styles.rowActionBtn, { borderColor: theme.colors.border }]} onPress={() => onNavigate('form', item.id)}>
        <Edit size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable onPress={() => handleDelete(item)} style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}>
        <Trash2 size={16} color={theme.colors.error} />
      </Pressable>
    </>
  );

  const renderCustomerCard = (item: any) => {
    const rawStatus = String(item.status || 'Active').toUpperCase();
    const isInactive = rawStatus === 'INACTIVE' || rawStatus === 'DISABLED';
    const statusColor = isInactive ? '#EF4444' : '#10B981';
    const statusBg = isInactive ? '#FEF2F2' : '#ECFDF5';
    const statusLabel = isInactive ? 'Inactive' : 'Active';
    const bal = Number(item.outstandingBalance !== undefined ? item.outstandingBalance : 0);
    const balColor = bal > 0 ? '#EF4444' : bal < 0 ? '#10B981' : theme.colors.textSecondary;
    const code = `CU${String((String(item.id).charCodeAt(0) || 0) % 999).padStart(3, '0')}`;
    const displayName = item.name || item.customerName || `Customer #${item.id}`;

    return (
      <View style={[styles.mobileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.cardTitle, { color: theme.colors.text, flexShrink: 1 }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                {code}
              </Text>
            </View>
            <View style={[styles.cardMetaRow, { marginTop: 4, marginBottom: 0 }]}>
              <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusColor }]}>
                <View style={[styles.dot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
              {item.phone ? (
                <View style={styles.contactItem}>
                  <Phone size={11} color={theme.colors.textSecondary} />
                  <Text style={[styles.contactText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {item.phone}
                  </Text>
                </View>
              ) : null}
              {item.email ? (
                <View style={styles.contactItem}>
                  <Mail size={11} color={theme.colors.textSecondary} />
                  <Text style={[styles.contactText, { color: theme.colors.textSecondary, maxWidth: 120 }]} numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <SyncBadge status={item.syncStatus} />
        </View>

        <View style={[styles.cardFooter, { borderTopColor: theme.colors.divider }]}>
          <View>
            <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>Due Balance</Text>
            <Text style={[styles.cardBalance, { color: balColor }]}>
              ₹{bal.toFixed(2)}
            </Text>
          </View>

          <View style={styles.cardActions}>
            <Pressable
              style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}
              onPress={() => onNavigate('details', item.id)}
            >
              <Eye size={14} color={theme.colors.textSecondary} />
            </Pressable>
            <Pressable
              style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}
              onPress={() => onNavigate('form', item.id)}
            >
              <Edit size={14} color="#F59E0B" />
            </Pressable>
            <Pressable
              style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}
              onPress={() => handleDelete(item)}
            >
              <Trash2 size={14} color="#EF4444" />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, padding: isMobile ? 8 : 16 }]}>
      <AdvancedTable
        title="Customers"
        subtitle="Manage your customers"
        headerActions={headerActions}
        columns={columns}
        data={filteredCustomers}
        onSearch={setSearchQuery}
        filters={filters}
        renderRowActions={renderRowActions}
        renderMobileCard={renderCustomerCard}
        isLoading={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActionsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'nowrap',
  },
  headerActionsWrapperMobile: {
    gap: 6,
  },
  headerActionsWrapperSmall: {
    gap: 4,
  },
  iconButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  iconButtonMobile: {
    padding: 6,
  },
  iconButtonSmall: {
    padding: 4,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    gap: 6,
  },
  primaryActionBtnMobile: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  primaryActionBtnSmall: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    gap: 3,
  },
  primaryActionText: { color: 'white', fontSize: 13, fontWeight: '600' },
  primaryActionTextMobile: { fontSize: 12 },
  primaryActionTextSmall: { fontSize: 11 },
  filtersWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterSelect: {
    marginBottom: 0,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#FEF2F2',
  },
  clearFilterText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  rowActionBtn: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 6,
    backgroundColor: 'white',
  },
  mobileCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 9,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  cardBalance: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});



