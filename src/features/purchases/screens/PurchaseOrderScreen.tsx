import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Modal, ScrollView, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { PurchaseScreenType } from '../PurchasesModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { AddPurchaseOrderModal } from '../components/AddPurchaseOrderModal';
import { usePurchaseOrders, useDeletePurchaseOrder } from '../api/usePurchaseOrders';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { useSyncStore } from '../../../core/sync/useSyncStore';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { 
  FileCheck, 
  RefreshCw, 
  PlusCircle, 
  Trash2, 
  Eye, 
  X,
  Truck,
} from 'lucide-react-native';

interface Props {
  onNavigate: (screen: PurchaseScreenType, id?: string) => void;
}

export const PurchaseOrderScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewItem, setViewItem] = useState<any | null>(null);

  const { data: dbOrders = [], isLoading, refetch } = usePurchaseOrders();
  const deletePOMutation = useDeletePurchaseOrder();
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  useEffect(() => {
    refetch();
  }, [lastSyncedAt, refetch]);

  const allOrders = useMemo(() => {
    if (dbOrders && dbOrders.length > 0) {
      return dbOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        supplierName: o.supplierName || 'Unknown Supplier',
        orderDate: o.orderDate,
        expectedDate: o.expectedDate,
        subtotal: Number(o.subtotal || 0),
        discount: Number(o.discount || 0),
        taxTotal: Number(o.taxTotal || 0),
        shipping: Number(o.shipping || 0),
        grandTotal: Number(o.grandTotal || 0),
        status: o.status || 'Ordered',
        syncStatus: (o as any).syncStatus || 'synced',
        notes: o.notes,
        items: o.items || [],
      }));
    }
    return [];
  }, [dbOrders]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return allOrders;
    const q = searchQuery.toLowerCase().trim();
    return allOrders.filter((item) =>
      item.orderNumber?.toLowerCase().includes(q) ||
      item.supplierName?.toLowerCase().includes(q) ||
      item.status?.toLowerCase().includes(q)
    );
  }, [allOrders, searchQuery]);

  const handleDelete = (item: any) => {
    const doDelete = async () => {
      try {
        await deletePOMutation.mutateAsync(item.id);
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to delete');
      }
    };

    if (Platform.OS === 'web') {
      if ((globalThis as any).confirm(`Are you sure you want to delete purchase order ${item.orderNumber}?`)) {
        void doDelete();
      }
      return;
    }

    Alert.alert(
      'Delete Purchase Order',
      `Are you sure you want to delete purchase order ${item.orderNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { void doDelete(); },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Received': return { bg: '#10B981', text: 'white' };
      case 'Ordered': return { bg: '#F59E0B', text: 'white' };
      case 'Pending': return { bg: '#0EA5E9', text: 'white' };
      case 'Cancelled': return { bg: '#EF4444', text: 'white' };
      default: return { bg: theme.colors.border, text: theme.colors.text };
    }
  };

  const columns = [
    { 
      key: 'orderNumber', 
      title: 'PO Number', 
      flex: 1.2,
      minWidth: 120,
      render: (value: string) => <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{value}</Text>
    },
    { 
      key: 'supplierName', 
      title: 'Supplier Name', 
      flex: 1.5,
      minWidth: 150,
      render: (value: string) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Truck size={14} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
        </View>
      )
    },
    { 
      key: 'orderDate', 
      title: 'Order Date', 
      flex: 1,
      minWidth: 100,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
    },
    { 
      key: 'grandTotal', 
      title: 'Order Total', 
      width: 120,
      render: (value: number) => <Text style={{ color: '#F59E0B', fontWeight: '600' }}>₹{value?.toFixed(2) || '0.00'}</Text>
    },
    { 
      key: 'status', 
      title: 'Status', 
      width: 110,
      render: (value: string) => {
        const colors = getStatusColor(value);
        return (
          <View style={{ backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start' }}>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '500' }}>{value}</Text>
          </View>
        );
      }
    },
    {
      key: 'syncStatus',
      title: 'Sync',
      width: 90,
      render: (value: string) => <SyncBadge status={value} />,
    },
    {
      key: 'actions',
      title: 'Actions',
      width: 80,
      render: (_: any, item: any) => (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable onPress={() => setViewItem(item)} style={{ padding: 4 }}>
            <Eye size={16} color={theme.colors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => handleDelete(item)} style={{ padding: 4 }}>
            <Trash2 size={16} color="#EF4444" />
          </Pressable>
        </View>
      )
    }
  ];

  const isSmallMobile = isMobile && windowWidth < 380;
  const actionIconSize = isMobile ? (isSmallMobile ? 14 : 15) : 16;
  const addBtnLabel = !isMobile ? 'Add Purchase Order' : (windowWidth >= 480 ? 'Add PO' : 'Add');

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
          styles.addButton, 
          { backgroundColor: '#F59E0B' },
          isMobile && styles.addButtonMobile,
          isSmallMobile && styles.addButtonSmall,
        ]}
        onPress={() => setShowAddModal(true)}
      >
        <PlusCircle size={actionIconSize} color="white" />
        <Text style={[
          styles.addButtonText,
          isMobile && styles.addButtonTextMobile,
          isSmallMobile && styles.addButtonTextSmall,
        ]}>{addBtnLabel}</Text>
      </Pressable>
    </View>
  );

  const renderPOCard = (item: any) => {
    const statusColors = getStatusColor(item.status);
    return (
      <View style={[styles.mobileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.orderNumber}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Truck size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {item.supplierName}
              </Text>
            </View>
          </View>
          <SyncBadge status={item.syncStatus} />
        </View>

        <View style={styles.cardInfoRow}>
          <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>Date: {item.orderDate}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>{item.status}</Text>
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: theme.colors.divider }]}>
          <View>
            <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>Order Total</Text>
            <Text style={[styles.cardPrice, { color: '#F59E0B' }]}>₹{item.grandTotal?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.cardActions}>
            <Pressable onPress={() => setViewItem(item)} style={[styles.actionBtn, { borderColor: theme.colors.border }]}>
              <Eye size={15} color={theme.colors.textSecondary} />
            </Pressable>
            <Pressable onPress={() => handleDelete(item)} style={[styles.actionBtn, { borderColor: theme.colors.border }]}>
              <Trash2 size={15} color="#EF4444" />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, padding: isMobile ? 8 : 16 }]}>
      <AdvancedTable
        title="Purchase Orders"
        subtitle="Track purchase orders placed with suppliers"
        headerActions={headerActions}
        data={filteredData}
        columns={columns}
        onSearch={setSearchQuery}
        searchPlaceholder="Search PO number, supplier, status..."
        isLoading={isLoading}
        hasCheckbox={false}
        renderMobileCard={renderPOCard}
      />

      {/* Add Purchase Order Modal */}
      <AddPurchaseOrderModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* View PO Details Modal */}
      {viewItem && (
        <Modal visible={!!viewItem} transparent animationType="fade">
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)', padding: isMobile ? 8 : 16 }]}>
            <View style={[styles.modalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, width: isMobile ? '96%' : '90%' }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    Purchase Order #{viewItem.orderNumber}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
                    Supplier: {viewItem.supplierName}
                  </Text>
                </View>
                <Pressable onPress={() => setViewItem(null)}>
                  <X size={20} color={theme.colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={{ padding: isMobile ? 12 : 16, maxHeight: 420 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Order Date: {viewItem.orderDate}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Status: {viewItem.status}</Text>
                </View>
                {viewItem.expectedDate && (
                  <Text style={{ color: theme.colors.textSecondary, marginBottom: 8, fontSize: 13 }}>
                    Expected Delivery: <Text style={{ color: theme.colors.text }}>{viewItem.expectedDate}</Text>
                  </Text>
                )}

                {viewItem.items && viewItem.items.length > 0 && (
                  <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '600', marginBottom: 6 }}>Ordered Items:</Text>
                    {viewItem.items.map((i: any, idx: number) => (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                        <Text style={{ color: theme.colors.textSecondary, flex: 2 }}>{i.productName || `Product #${i.productId}`}</Text>
                        <Text style={{ color: theme.colors.textSecondary, flex: 1 }}>{i.quantity}x @ ₹{Number(i.unitPrice).toFixed(2)}</Text>
                        <Text style={{ color: theme.colors.text, fontWeight: '500' }}>₹{Number(i.total).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10, gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.textSecondary }}>Subtotal:</Text>
                    <Text style={{ color: theme.colors.text }}>₹{Number(viewItem.subtotal).toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.textSecondary }}>Tax:</Text>
                    <Text style={{ color: theme.colors.text }}>₹{Number(viewItem.taxTotal || 0).toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 6, marginTop: 4 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Grand Total:</Text>
                    <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 16 }}>₹{Number(viewItem.grandTotal).toFixed(2)}</Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
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
    borderWidth: 1,
    borderRadius: 6,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonMobile: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  addButtonSmall: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    gap: 3,
  },
  addButtonText: { color: 'white', fontWeight: '600', fontSize: 13 },
  addButtonTextMobile: { fontSize: 12 },
  addButtonTextSmall: { fontSize: 11 },
  mobileCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
  },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  cardPrice: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: 'white',
  },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBox: { maxWidth: 500, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: 'bold' },
});
