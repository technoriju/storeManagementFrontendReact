import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { useSuppliers, useDeleteSupplier } from '../api/useSupplier';
import { SupplierScreenType } from '../SuppliersModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
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
} from 'lucide-react-native';

interface Props {
  onNavigate: (screen: SupplierScreenType, supplierId?: string | number) => void;
}

export const SupplierListScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();
  const { data: suppliers = [], isLoading, refetch } = useSuppliers();
  const deleteMutation = useDeleteSupplier();
  const [searchQuery, setSearchQuery] = useState('');
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  useEffect(() => {
    if (lastSyncedAt) {
      refetch();
    }
  }, [lastSyncedAt, refetch]);

  // In a real app, you'd fetch here
  // Using dummy Code like SU001 for demonstration to match screenshot

  const columns = [
    { 
      key: 'code', 
      title: 'Code', 
      width: 100,
      render: (value: any, item: any, index?: number) => {
        // Generating a dummy code based on ID or index, assuming simple string
        const code = `SU${String((String(item.id).charCodeAt(0) || 0) % 999).padStart(3, '0')}`;
        return <Text style={{ color: theme.colors.textSecondary }}>{code}</Text>;
      }
    },
    { 
      key: 'name', 
      title: 'Supplier', 
      flex: 2,
      minWidth: 200,
      render: (value: string) => (
        <Text style={{ color: theme.colors.text, fontWeight: '500' }}>{value}</Text>
      )
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
        // Extract country from address or default
        const country = item.address?.split(',').pop()?.trim() || 'N/A';
        return <Text style={{ color: theme.colors.textSecondary }}>{country}</Text>;
      }
    },
    { 
      key: 'outstandingBalance', 
      title: 'Payable Due', 
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
  const addBtnLabel = !isMobile ? 'Add Supplier' : (windowWidth >= 480 ? 'Add Supplier' : 'Add');

  const headerActions = (
    <View style={[
      styles.headerActionsWrapper,
      isMobile && styles.headerActionsWrapperMobile,
      isSmallMobile && styles.headerActionsWrapperSmall,
    ]}>
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
        ]}>
          {addBtnLabel}
        </Text>
      </Pressable>
    </View>
  );

  const filters = (
    <View style={[styles.filterDropdown, { borderColor: theme.colors.border }]}>
      <Text style={{ color: theme.colors.text }}>Status</Text>
      <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
    </View>
  );

  const handleDelete = (item: any) => {
    const remove = () => deleteMutation.mutate(item.id);
    if (Platform.OS === 'web') {
      if ((globalThis as any).confirm(`Delete ${item.name}?`)) remove();
      return;
    }
    Alert.alert('Delete Supplier', `Delete ${item.name}?`, [
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

  const renderSupplierCard = (item: any) => {
    const rawStatus = String(item.status || 'Active').toUpperCase();
    const isInactive = rawStatus === 'INACTIVE' || rawStatus === 'DISABLED';
    const statusColor = isInactive ? '#EF4444' : '#10B981';
    const statusBg = isInactive ? '#FEF2F2' : '#ECFDF5';
    const statusLabel = isInactive ? 'Inactive' : 'Active';
    const bal = Number(item.outstandingBalance !== undefined ? item.outstandingBalance : 0);
    const balColor = bal > 0 ? '#EF4444' : bal < 0 ? '#10B981' : theme.colors.textSecondary;
    const code = `SU${String((String(item.id).charCodeAt(0) || 0) % 999).padStart(3, '0')}`;
    const displayName = item.name || `Supplier #${item.id}`;

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
            <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>Payable Due</Text>
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
        title="Suppliers"
        subtitle="Manage your suppliers"
        headerActions={headerActions}
        columns={columns}
        data={suppliers}
        onSearch={setSearchQuery}
        filters={filters}
        renderRowActions={renderRowActions}
        renderMobileCard={renderSupplierCard}
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
    width: 30,
    height: 30,
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
    paddingHorizontal: 9,
    height: 32,
    gap: 5,
  },
  primaryActionBtnSmall: {
    paddingHorizontal: 7,
    height: 30,
    gap: 4,
  },
  primaryActionText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  primaryActionTextMobile: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  primaryActionTextSmall: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 36,
    backgroundColor: 'white',
  },
  rowActionBtn: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
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
    paddingTop: 6,
    marginTop: 6,
  },
  cardBalance: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});


