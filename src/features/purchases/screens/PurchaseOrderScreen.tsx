import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Modal, ScrollView } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { PurchaseScreenType } from '../PurchasesModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { AddPurchaseOrderModal } from '../components/AddPurchaseOrderModal';
import { usePurchaseOrders, useDeletePurchaseOrder } from '../api/usePurchaseOrders';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewItem, setViewItem] = useState<any | null>(null);

  const { data: dbOrders = [], isLoading, refetch } = usePurchaseOrders();
  const deletePOMutation = useDeletePurchaseOrder();

  const fallbackOrders = useMemo(() => [
    { id: 1, orderNumber: 'PO-001', supplierName: 'Electro Mart', orderDate: '2024-12-24', status: 'Ordered', grandTotal: 1000, subtotal: 900, taxTotal: 100 },
    { id: 2, orderNumber: 'PO-002', supplierName: 'Quantum Gadgets', orderDate: '2024-12-10', status: 'Pending', grandTotal: 1500, subtotal: 1400, taxTotal: 100 },
    { id: 3, orderNumber: 'PO-003', supplierName: 'Prime Bazaar', orderDate: '2024-11-27', status: 'Received', grandTotal: 1500, subtotal: 1500, taxTotal: 0 },
    { id: 4, orderNumber: 'PO-004', supplierName: 'Gadget World', orderDate: '2024-11-18', status: 'Ordered', grandTotal: 2000, subtotal: 1800, taxTotal: 200 },
  ], []);

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
        notes: o.notes,
        items: o.items || [],
      }));
    }
    return fallbackOrders;
  }, [dbOrders, fallbackOrders]);

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
    Alert.alert(
      'Delete Purchase Order',
      `Are you sure you want to delete purchase order ${item.orderNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePOMutation.mutateAsync(item.id);
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
      render: (value: number) => <Text style={{ color: '#F59E0B', fontWeight: '600' }}>${value?.toFixed(2) || '0.00'}</Text>
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
          <Text style={[styles.title, { color: theme.colors.text }]}>Purchase Orders</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Track purchase orders placed with suppliers</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable 
            style={[styles.iconButton, { borderColor: theme.colors.border }]}
            onPress={() => refetch()}
          >
            <RefreshCw size={16} color={theme.colors.textSecondary} />
          </Pressable>

          <Pressable 
            style={[styles.addButton, { backgroundColor: '#F59E0B' }]}
            onPress={() => setShowAddModal(true)}
          >
            <PlusCircle size={16} color="white" />
            <Text style={styles.addButtonText}>Add Purchase Order</Text>
          </Pressable>
        </View>
      </View>

      {/* Advanced Table */}
      <View style={styles.tableCard}>
        <AdvancedTable
          data={filteredData}
          columns={columns}
          onSearch={setSearchQuery}
          searchPlaceholder="Search PO number, supplier, status..."
          isLoading={isLoading}
          hasCheckbox={false}
        />
      </View>

      {/* Add Purchase Order Modal */}
      <AddPurchaseOrderModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* View PO Details Modal */}
      {viewItem && (
        <Modal visible={!!viewItem} transparent animationType="fade">
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Purchase Order #{viewItem.orderNumber}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Supplier: {viewItem.supplierName}</Text>
                </View>
                <Pressable onPress={() => setViewItem(null)}>
                  <X size={20} color={theme.colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={{ padding: 16, maxHeight: 400 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ color: theme.colors.textSecondary }}>Order Date: {viewItem.orderDate}</Text>
                  <Text style={{ color: theme.colors.textSecondary }}>Status: {viewItem.status}</Text>
                </View>
                {viewItem.expectedDate && (
                  <Text style={{ color: theme.colors.textSecondary, marginBottom: 8 }}>
                    Expected Delivery: <Text style={{ color: theme.colors.text }}>{viewItem.expectedDate}</Text>
                  </Text>
                )}

                {viewItem.items && viewItem.items.length > 0 && (
                  <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '600', marginBottom: 6 }}>Ordered Items:</Text>
                    {viewItem.items.map((i: any, idx: number) => (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                        <Text style={{ color: theme.colors.textSecondary, flex: 2 }}>{i.productName || `Product #${i.productId}`}</Text>
                        <Text style={{ color: theme.colors.textSecondary, flex: 1 }}>{i.quantity}x @ ${Number(i.unitPrice).toFixed(2)}</Text>
                        <Text style={{ color: theme.colors.text, fontWeight: '500' }}>${Number(i.total).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10, gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.textSecondary }}>Subtotal:</Text>
                    <Text style={{ color: theme.colors.text }}>${Number(viewItem.subtotal).toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.textSecondary }}>Tax:</Text>
                    <Text style={{ color: theme.colors.text }}>${Number(viewItem.taxTotal || 0).toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 6, marginTop: 4 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Grand Total:</Text>
                    <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 16 }}>${Number(viewItem.grandTotal).toFixed(2)}</Text>
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
