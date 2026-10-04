import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Modal, ScrollView } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { PosScreenType } from '../POSModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { AddSalesReturnModal } from '../components/AddSalesReturnModal';
import { useSalesReturns, useDeleteSaleReturn } from '../api/useSalesReturns';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { useSyncStore } from '../../../core/sync/useSyncStore';
import { 
  RotateCcw, 
  RefreshCw, 
  PlusCircle, 
  Trash2, 
  Eye, 
  X,
  User,
} from 'lucide-react-native';

interface Props {
  onNavigate: (screen: PosScreenType, id?: string) => void;
}

export const SalesReturnScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewItem, setViewItem] = useState<any | null>(null);

  const { data: dbReturns = [], isLoading, refetch } = useSalesReturns();
  const deleteReturnMutation = useDeleteSaleReturn();
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  useEffect(() => {
    refetch();
  }, [lastSyncedAt, refetch]);

  const fallbackReturns = useMemo(() => [
    { id: 1, returnNumber: 'SRT-001', customerName: 'Carl Evans', date: '2024-12-24', status: 'Received', totalAmount: 1000, reason: 'Defective speaker', syncStatus: 'synced' },
    { id: 2, returnNumber: 'SRT-002', customerName: 'Minerva Rameriz', date: '2024-12-10', status: 'Pending', totalAmount: 1500, reason: 'Wrong color', syncStatus: 'synced' },
    { id: 3, returnNumber: 'SRT-003', customerName: 'Robert Lamon', date: '2024-11-20', status: 'Received', totalAmount: 2000, reason: 'Customer changed mind', syncStatus: 'synced' },
    { id: 4, returnNumber: 'SRT-004', customerName: 'Mark Joslyn', date: '2024-11-15', status: 'Received', totalAmount: 800, reason: 'Damaged packaging', syncStatus: 'synced' },
  ], []);

  const allReturns = useMemo(() => {
    if (dbReturns && dbReturns.length > 0) {
      return dbReturns.map((r) => ({
        id: r.id,
        returnNumber: r.returnNumber,
        customerName: r.customerName || 'Walk-in Customer',
        date: r.date,
        totalAmount: Number(r.totalAmount || 0),
        status: r.status || 'Received',
        syncStatus: (r as any).syncStatus || 'synced',
        reason: r.reason,
        items: r.items || [],
      }));
    }
    return fallbackReturns;
  }, [dbReturns, fallbackReturns]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return allReturns;
    const q = searchQuery.toLowerCase().trim();
    return allReturns.filter((item) =>
      item.returnNumber?.toLowerCase().includes(q) ||
      item.customerName?.toLowerCase().includes(q) ||
      item.status?.toLowerCase().includes(q) ||
      item.reason?.toLowerCase().includes(q)
    );
  }, [allReturns, searchQuery]);

  const handleDelete = (item: any) => {
    Alert.alert(
      'Delete Sales Return',
      `Are you sure you want to delete return record ${item.returnNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReturnMutation.mutateAsync(item.id);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Received': return { bg: '#10B981', text: 'white' };
      case 'Pending': return { bg: '#0EA5E9', text: 'white' };
      default: return { bg: theme.colors.border, text: theme.colors.text };
    }
  };

  const columns = [
    { 
      key: 'returnNumber', 
      title: 'Return No', 
      flex: 1.2,
      minWidth: 120,
      render: (value: string) => <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{value}</Text>
    },
    { 
      key: 'customerName', 
      title: 'Customer', 
      flex: 1.5,
      minWidth: 150,
      render: (value: string) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <User size={14} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
        </View>
      )
    },
    { 
      key: 'date', 
      title: 'Date', 
      flex: 1,
      minWidth: 100,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
    },
    { 
      key: 'totalAmount', 
      title: 'Refund Amount', 
      width: 120,
      render: (value: number) => <Text style={{ color: '#0EA5E9', fontWeight: '600' }}>₹{value?.toFixed(2) || '0.00'}</Text>
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
      key: 'reason', 
      title: 'Reason', 
      flex: 1.5,
      minWidth: 130,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }} numberOfLines={1}>{value || '-'}</Text>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Sales Return</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Manage customer product returns and inventory restock</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable 
            style={[styles.iconButton, { borderColor: theme.colors.border }]}
            onPress={() => refetch()}
          >
            <RefreshCw size={16} color={theme.colors.textSecondary} />
          </Pressable>

          <Pressable 
            style={[styles.addButton, { backgroundColor: '#0EA5E9' }]}
            onPress={() => setShowAddModal(true)}
          >
            <PlusCircle size={16} color="white" />
            <Text style={styles.addButtonText}>Add Sales Return</Text>
          </Pressable>
        </View>
      </View>

      {/* Advanced Table */}
      <View style={styles.tableCard}>
        <AdvancedTable
          data={filteredData}
          columns={columns}
          onSearch={setSearchQuery}
          searchPlaceholder="Search return no, customer, reason..."
          isLoading={isLoading}
          hasCheckbox={false}
        />
      </View>

      {/* Add Sales Return Modal */}
      <AddSalesReturnModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* View Return Details Modal */}
      {viewItem && (
        <Modal visible={!!viewItem} transparent animationType="fade">
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Return #{viewItem.returnNumber}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Customer: {viewItem.customerName}</Text>
                </View>
                <Pressable onPress={() => setViewItem(null)}>
                  <X size={20} color={theme.colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={{ padding: 16, maxHeight: 400 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ color: theme.colors.textSecondary }}>Date: {viewItem.date}</Text>
                  <Text style={{ color: theme.colors.textSecondary }}>Status: {viewItem.status}</Text>
                </View>
                {viewItem.reason && (
                  <Text style={{ color: theme.colors.textSecondary, marginBottom: 8 }}>
                    Reason: <Text style={{ color: theme.colors.text }}>{viewItem.reason}</Text>
                  </Text>
                )}

                {viewItem.items && viewItem.items.length > 0 && (
                  <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '600', marginBottom: 6 }}>Returned Products:</Text>
                    {viewItem.items.map((i: any, idx: number) => (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                        <Text style={{ color: theme.colors.textSecondary, flex: 2 }}>{i.productName || `Product #${i.productId}`}</Text>
                        <Text style={{ color: theme.colors.textSecondary, flex: 1 }}>{i.quantity}x @ ₹{Number(i.unitPrice).toFixed(2)}</Text>
                        <Text style={{ color: theme.colors.text, fontWeight: '500' }}>₹{Number(i.total).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>Total Refund:</Text>
                    <Text style={{ color: '#0EA5E9', fontWeight: '700', fontSize: 18 }}>₹{Number(viewItem.totalAmount).toFixed(2)}</Text>
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
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold' },
  subtitle: { fontSize: 13, marginTop: 2 },
  iconButton: { padding: 8, borderWidth: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: 'white', fontWeight: '600', fontSize: 13 },
  tableCard: { flex: 1 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalBox: { width: '90%', maxWidth: 500, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: 'bold' },
});
