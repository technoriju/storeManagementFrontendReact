import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Modal, ScrollView } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { PosScreenType } from '../POSModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { useSyncStore } from '../../../core/sync/useSyncStore';
import { useSales, useDeleteSale } from '../api/useSales';
import { 
  FileText, 
  RefreshCw, 
  Trash2, 
  Eye, 
  X, 
  User, 
  Printer, 
  CreditCard,
  PlusCircle, 
} from 'lucide-react-native';
import { ReceiptPrintPreviewModal, ReceiptPrintData } from '../components/ReceiptPrintPreviewModal';
import { AddSalesModal } from '../components/AddSalesModal';

interface Props {
  onNavigate: (screen: PosScreenType, id?: string) => void;
}

export const InvoicesScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewInvoice, setViewInvoice] = useState<any | null>(null);
  const [printData, setPrintData] = useState<ReceiptPrintData | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: dbSales = [], isLoading, refetch } = useSales();
  const deleteSaleMutation = useDeleteSale();
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  useEffect(() => {
    refetch();
  }, [lastSyncedAt, refetch]);

  const fallbackInvoices = useMemo(() => [
    { id: 1, invoiceNumber: 'INV001', customerName: 'Carl Evans', date: '2024-12-24', total: 1000, paid: 1000, due: 0, paymentStatus: 'Paid', syncStatus: 'synced' },
    { id: 2, invoiceNumber: 'INV002', customerName: 'Minerva Rameriz', date: '2024-12-10', total: 1500, paid: 0, due: 1500, paymentStatus: 'Unpaid', syncStatus: 'synced' },
    { id: 3, invoiceNumber: 'INV003', customerName: 'Robert Lamon', date: '2024-11-20', total: 1500, paid: 0, due: 1500, paymentStatus: 'Unpaid', syncStatus: 'synced' },
    { id: 4, invoiceNumber: 'INV004', customerName: 'Patricia Lewis', date: '2024-11-15', total: 2000, paid: 1000, due: 1000, paymentStatus: 'Overdue', syncStatus: 'synced' },
    { id: 5, invoiceNumber: 'INV005', customerName: 'Mark Joslyn', date: '2024-10-30', total: 800, paid: 800, due: 0, paymentStatus: 'Paid', syncStatus: 'synced' },
  ], []);

  const allInvoices = useMemo(() => {
    if (dbSales && dbSales.length > 0) {
      return dbSales.map((s) => {
        const total = Number(s.total || 0);
        const paid = Number(s.paid || 0);
        const due = Number(s.due !== undefined ? s.due : Math.max(0, total - paid));
        let payStatus = s.paymentStatus || 'Unpaid';
        if (!s.paymentStatus) {
          if (paid >= total && total > 0) payStatus = 'Paid';
          else if (paid > 0) payStatus = 'Partial';
          else payStatus = 'Unpaid';
        }
        return {
          id: s.id,
          invoiceNumber: s.invoiceNumber || `INV-${s.id}`,
          reference: s.reference,
          customerName: s.customerName || 'Walk-in Customer',
          date: s.date || (s.createdAt ? s.createdAt.split('T')[0] : ''),
          subtotal: Number(s.subtotal || 0),
          discount: Number(s.discount || 0),
          orderTax: Number(s.orderTax || 0),
          gst: Number(s.gst || 0),
          shipping: Number(s.shipping || 0),
          total,
          paid,
          due,
          status: s.status || 'Completed',
          paymentStatus: payStatus,
          biller: s.biller || 'Admin',
          notes: s.notes,
          items: s.items || [],
          syncStatus: s.syncStatus || 'synced',
        };
      });
    }
    return fallbackInvoices;
  }, [dbSales, fallbackInvoices]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return allInvoices;
    const q = searchQuery.toLowerCase().trim();
    return allInvoices.filter((item) =>
      item.invoiceNumber?.toLowerCase().includes(q) ||
      item.customerName?.toLowerCase().includes(q) ||
      item.paymentStatus?.toLowerCase().includes(q)
    );
  }, [allInvoices, searchQuery]);

  const handleDelete = (item: any) => {
    Alert.alert(
      'Delete Invoice',
      `Are you sure you want to delete invoice ${item.invoiceNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSaleMutation.mutateAsync(item.id);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const handleOpenPrintPreview = (invoice: any) => {
    if (!invoice) return;
    const invItems = invoice.items && invoice.items.length > 0
      ? invoice.items.map((i: any) => ({
          productId: i.productId,
          productName: i.productName || `Product #${i.productId || 1}`,
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
          discount: Number(i.discount) || 0,
          gst: Number(i.gst) || 0,
          taxAmount: Number(i.taxAmount) || 0,
          total: Number(i.total) || 0,
          unit: i.unit || 'Pcs',
          hsn: i.hsn || '',
        }))
      : [
          {
            productName: 'General Goods / Services',
            quantity: 1,
            unitPrice: Number(invoice.total || 0),
            discount: 0,
            gst: Number(invoice.orderTax || invoice.gst || 0),
            total: Number(invoice.total || 0),
            unit: 'Unit',
          },
        ];

    const rData: ReceiptPrintData = {
      invoiceNumber: invoice.invoiceNumber,
      reference: invoice.reference,
      date: invoice.date,
      customerName: invoice.customerName || 'Walk-in Customer',
      customerPhone: invoice.customerPhone || '',
      customerAddress: invoice.customerAddress || '',
      customerGstin: invoice.customerGstin || '',
      customerType: (invoice.customerGstin && invoice.customerGstin.length > 3) ? 'wholesale' : 'retail',
      biller: invoice.biller || 'Cashier',
      subtotal: Number(invoice.subtotal || invoice.total || 0),
      discount: Number(invoice.discount || 0),
      gst: Number((invoice.orderTax || 0) + (invoice.gst || 0)),
      total: Number(invoice.total || 0),
      paid: Number(invoice.paid !== undefined ? invoice.paid : invoice.total || 0),
      due: Number(invoice.due !== undefined ? invoice.due : 0),
      paymentMethod: invoice.paymentMethod || 'Cash',
      items: invItems,
    };

    setPrintData(rData);
    setShowPrintModal(true);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Paid': return { bg: '#ECFDF5', text: '#10B981', dot: '#10B981' };
      case 'Unpaid': return { bg: '#FEF2F2', text: '#EF4444', dot: '#EF4444' };
      case 'Overdue': return { bg: '#FFFBEB', text: '#F59E0B', dot: '#F59E0B' };
      case 'Partial': return { bg: '#EFF6FF', text: '#3B82F6', dot: '#3B82F6' };
      default: return { bg: theme.colors.background, text: theme.colors.textSecondary, dot: 'transparent' };
    }
  };

  const columns = [
    { 
      key: 'invoiceNumber', 
      title: 'Invoice No', 
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
      key: 'total', 
      title: 'Amount', 
      width: 100,
      render: (value: number) => <Text style={{ color: theme.colors.text, fontWeight: '600' }}>₹{value?.toFixed(2) || '0.00'}</Text>
    },
    { 
      key: 'paid', 
      title: 'Paid', 
      width: 100,
      render: (value: number) => <Text style={{ color: '#10B981', fontWeight: '500' }}>₹{value?.toFixed(2) || '0.00'}</Text>
    },
    { 
      key: 'due', 
      title: 'Due Amount', 
      width: 100,
      render: (value: number) => (
        <Text style={{ color: value > 0 ? '#EF4444' : theme.colors.textSecondary, fontWeight: value > 0 ? '600' : 'normal' }}>
          ₹{value?.toFixed(2) || '0.00'}
        </Text>
      )
    },
    { 
      key: 'paymentStatus', 
      title: 'Status', 
      width: 110,
      render: (value: string) => {
        const style = getStatusStyle(value);
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: style.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: style.dot }} />
            <Text style={{ color: style.text, fontSize: 12, fontWeight: '500' }}>{value}</Text>
          </View>
        );
      }
    },
    { 
      key: 'syncStatus', 
      title: 'Sync', 
      width: 100,
      render: (value: string | undefined) => <SyncBadge status={value} />
    },
    {
      key: 'actions',
      title: 'Actions',
      width: 100,
      render: (_: any, item: any) => (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable onPress={() => handleOpenPrintPreview(item)} style={{ padding: 4 }}>
            <Printer size={16} color={theme.colors.primary} />
          </Pressable>
          <Pressable onPress={() => setViewInvoice(item)} style={{ padding: 4 }}>
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
          <Text style={[styles.title, { color: theme.colors.text }]}>Invoices</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Sales invoices, receipts, and payment status</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable 
            style={[styles.primaryActionBtn, { backgroundColor: '#F97316' }]} 
            onPress={() => setShowAddModal(true)}
          >
            <PlusCircle size={16} color="white" />
            <Text style={styles.primaryActionText}>Add Sales Invoice</Text>
          </Pressable>
          <Pressable 
            style={[styles.iconButton, { borderColor: theme.colors.border }]}
            onPress={() => refetch()}
          >
            <RefreshCw size={16} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Advanced Table */}
      <View style={styles.tableCard}>
        <AdvancedTable
          data={filteredData}
          columns={columns}
          onSearch={setSearchQuery}
          searchPlaceholder="Search invoice no, customer, payment status..."
          isLoading={isLoading}
          hasCheckbox={false}
        />
      </View>

      {/* Invoice Details Modal */}
      {viewInvoice && (
        <Modal visible={!!viewInvoice} transparent animationType="fade">
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {/* Header */}
              <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <FileText size={20} color={theme.colors.primary} />
                  <View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Invoice {viewInvoice.invoiceNumber}</Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Date: {viewInvoice.date}</Text>
                  </View>
                </View>
                <Pressable onPress={() => setViewInvoice(null)}>
                  <X size={20} color={theme.colors.textSecondary} />
                </Pressable>
              </View>

              {/* Receipt Content */}
              <ScrollView style={{ padding: 16, maxHeight: 420 }}>
                {/* Customer Details */}
                <View style={[styles.receiptSection, { borderColor: theme.colors.border }]}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Billed To:</Text>
                  <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 15 }}>{viewInvoice.customerName}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Biller: {viewInvoice.biller}</Text>
                </View>

                {/* Items */}
                {viewInvoice.items && viewInvoice.items.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '600', marginBottom: 8 }}>Items Purchased:</Text>
                    {viewInvoice.items.map((i: any, idx: number) => (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                        <View style={{ flex: 2 }}>
                          <Text style={{ color: theme.colors.text, fontWeight: '500' }}>{i.productName || `Product #${i.productId}`}</Text>
                          <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>{i.quantity}x @ ₹{Number(i.unitPrice).toFixed(2)}</Text>
                        </View>
                        <Text style={{ color: theme.colors.text, fontWeight: '600' }}>₹{Number(i.total).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Calculation breakdown */}
                <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10, gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.textSecondary }}>Subtotal:</Text>
                    <Text style={{ color: theme.colors.text }}>₹{Number(viewInvoice.subtotal).toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.textSecondary }}>Discount:</Text>
                    <Text style={{ color: '#EF4444' }}>-₹{Number(viewInvoice.discount || 0).toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.textSecondary }}>Taxes & GST:</Text>
                    <Text style={{ color: theme.colors.text }}>₹{Number((viewInvoice.orderTax || 0) + (viewInvoice.gst || 0)).toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 4 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>Grand Total:</Text>
                    <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 18 }}>₹{Number(viewInvoice.total).toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#10B981', fontWeight: '600' }}>Amount Paid:</Text>
                    <Text style={{ color: '#10B981', fontWeight: '600' }}>₹{Number(viewInvoice.paid).toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: viewInvoice.due > 0 ? '#EF4444' : theme.colors.textSecondary, fontWeight: '600' }}>Balance Due:</Text>
                    <Text style={{ color: viewInvoice.due > 0 ? '#EF4444' : theme.colors.textSecondary, fontWeight: '600' }}>₹{Number(viewInvoice.due).toFixed(2)}</Text>
                  </View>
                </View>
              </ScrollView>

              {/* Modal footer with Print action */}
              <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
                <Pressable
                  style={[styles.printButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => {
                    handleOpenPrintPreview(viewInvoice);
                  }}
                >
                  <Printer size={16} color="white" />
                  <Text style={{ color: 'white', fontWeight: '600' }}>Print Receipt</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      <ReceiptPrintPreviewModal
        visible={showPrintModal}
        data={printData}
        onClose={() => setShowPrintModal(false)}
      />

      <AddSalesModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          refetch();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold' },
  subtitle: { fontSize: 13, marginTop: 2 },
  iconButton: { padding: 8, borderWidth: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  primaryActionText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  tableCard: { flex: 1 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalBox: { width: '90%', maxWidth: 500, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: 'bold' },
  receiptSection: { padding: 12, borderWidth: 1, borderRadius: 8, gap: 4 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderTopWidth: 1 },
  printButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
});
