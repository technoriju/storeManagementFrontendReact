import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Modal, ScrollView } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { PosScreenType } from '../POSModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { AddQuotationModal } from '../components/AddQuotationModal';
import { useQuotations, useDeleteQuotation } from '../api/useQuotations';
import { 
  FileText, 
  RefreshCw, 
  PlusCircle, 
  Trash2, 
  Eye, 
  X,
  Calendar,
  User,
} from 'lucide-react-native';

interface Props {
  onNavigate: (screen: PosScreenType, id?: string) => void;
}

export const QuotationScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewItem, setViewItem] = useState<any | null>(null);

  const { data: dbQuotations = [], isLoading, refetch } = useQuotations();
  const deleteQuotationMutation = useDeleteQuotation();

  const fallbackQuotations = useMemo(() => [
    { id: 1, quotationNumber: 'QT-001', customerName: 'Carl Evans', date: '2024-12-24', status: 'Sent', grandTotal: 550, subtotal: 500, discount: 0, taxTotal: 50 },
    { id: 2, quotationNumber: 'QT-002', customerName: 'Minerva Rameriz', date: '2024-12-10', status: 'Ordered', grandTotal: 430, subtotal: 400, discount: 10, taxTotal: 40 },
    { id: 3, quotationNumber: 'QT-003', customerName: 'Robert Lamon', date: '2024-11-20', status: 'Pending', grandTotal: 260, subtotal: 250, discount: 0, taxTotal: 10 },
    { id: 4, quotationNumber: 'QT-004', customerName: 'Mark Joslyn', date: '2024-11-15', status: 'Sent', grandTotal: 470, subtotal: 450, discount: 20, taxTotal: 40 },
    { id: 5, quotationNumber: 'QT-005', customerName: 'Patricia Lewis', date: '2024-10-30', status: 'Pending', grandTotal: 380, subtotal: 350, discount: 0, taxTotal: 30 },
  ], []);

  const allQuotations = useMemo(() => {
    if (dbQuotations && dbQuotations.length > 0) {
      return dbQuotations.map((q) => ({
        id: q.id,
        quotationNumber: q.quotationNumber,
        customerName: q.customerName || 'Walk-in Customer',
        date: q.date,
        expiryDate: q.expiryDate,
        subtotal: Number(q.subtotal || 0),
        discount: Number(q.discount || 0),
        taxTotal: Number(q.taxTotal || 0),
        shipping: Number(q.shipping || 0),
        grandTotal: Number(q.grandTotal || 0),
        status: q.status || 'Sent',
        notes: q.notes,
        items: q.items || [],
      }));
    }
    return fallbackQuotations;
  }, [dbQuotations, fallbackQuotations]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return allQuotations;
    const q = searchQuery.toLowerCase().trim();
    return allQuotations.filter((item) =>
      item.quotationNumber?.toLowerCase().includes(q) ||
      item.customerName?.toLowerCase().includes(q) ||
      item.status?.toLowerCase().includes(q)
    );
  }, [allQuotations, searchQuery]);

  const handleDelete = (item: any) => {
    Alert.alert(
      'Delete Quotation',
      `Are you sure you want to delete quotation ${item.quotationNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteQuotationMutation.mutateAsync(item.id);
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
      case 'Sent': return { bg: '#10B981', text: 'white' };
      case 'Ordered': return { bg: '#F59E0B', text: 'white' };
      case 'Pending': return { bg: '#0EA5E9', text: 'white' };
      case 'Accepted': return { bg: '#6366F1', text: 'white' };
      default: return { bg: theme.colors.border, text: theme.colors.text };
    }
  };

  const columns = [
    { 
      key: 'quotationNumber', 
      title: 'Quotation No', 
      flex: 1.2,
      minWidth: 120,
      render: (value: string) => <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{value}</Text>
    },
    { 
      key: 'customerName', 
      title: 'Customer Name', 
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
      key: 'grandTotal', 
      title: 'Total', 
      width: 100,
      render: (value: number) => <Text style={{ color: theme.colors.text, fontWeight: '600' }}>${value?.toFixed(2) || '0.00'}</Text>
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
          <Text style={[styles.title, { color: theme.colors.text }]}>Quotations</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Manage price quotes and estimates</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable 
            style={[styles.iconButton, { borderColor: theme.colors.border }]}
            onPress={() => refetch()}
          >
            <RefreshCw size={16} color={theme.colors.textSecondary} />
          </Pressable>

          <Pressable 
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowAddModal(true)}
          >
            <PlusCircle size={16} color="white" />
            <Text style={styles.addButtonText}>Add Quotation</Text>
          </Pressable>
        </View>
      </View>

      {/* Advanced Table */}
      <View style={styles.tableCard}>
        <AdvancedTable
          data={filteredData}
          columns={columns}
          onSearch={setSearchQuery}
          searchPlaceholder="Search quotation no, customer, status..."
          isLoading={isLoading}
          hasCheckbox={false}
        />
      </View>

      {/* Add Quotation Modal */}
      <AddQuotationModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* View Quotation Details Modal */}
      {viewItem && (
        <Modal visible={!!viewItem} transparent animationType="fade">
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Quotation #{viewItem.quotationNumber}</Text>
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

                {viewItem.items && viewItem.items.length > 0 && (
                  <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '600', marginBottom: 6 }}>Items:</Text>
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
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.textSecondary }}>Discount:</Text>
                    <Text style={{ color: '#EF4444' }}>-${Number(viewItem.discount || 0).toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 6, marginTop: 4 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Total Amount:</Text>
                    <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 16 }}>${Number(viewItem.grandTotal).toFixed(2)}</Text>
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
