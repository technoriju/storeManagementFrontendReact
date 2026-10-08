import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Modal, ScrollView, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { PosScreenType } from '../POSModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { useSyncStore } from '../../../core/sync/useSyncStore';
import { useSales, useDeleteSale } from '../api/useSales';
import { saleRepository } from '../../../core/repositories/SaleRepository';
import { 
  FileText, 
  RefreshCw, 
  Trash2, 
  Eye, 
  Edit,
  X, 
  User, 
  Printer, 
  CreditCard,
  PlusCircle, 
  Share2,
} from 'lucide-react-native';
import { ReceiptPrintPreviewModal, ReceiptPrintData } from '../components/ReceiptPrintPreviewModal';
import { AddSalesModal } from '../components/AddSalesModal';
import { ShareSaleModal } from '../components/ShareSaleModal';
import { SweetConfirmModal } from '../../../shared/components/feedback/SweetConfirmModal';

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
  const [editSaleId, setEditSaleId] = useState<number | string | null>(null);
  const [dismissedInvoiceIds, setDismissedInvoiceIds] = useState<any[]>([]);
  const [shareData, setShareData] = useState<any | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

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
      const seen = new Set<string>();
      const list: any[] = [];
      for (const s of dbSales) {
        if (dismissedInvoiceIds.includes(s.id)) continue;
        const invNum = (s.invoiceNumber || s.reference || String(s.id)).trim();
        if (invNum && seen.has(invNum)) continue;
        if (invNum) seen.add(invNum);

        const total = Number(s.total || 0);
        const paid = Number(s.paid || 0);
        const due = Number(s.due !== undefined ? s.due : Math.max(0, total - paid));
        let payStatus = s.paymentStatus || 'Unpaid';
        if (!s.paymentStatus) {
          if (paid >= total && total > 0) payStatus = 'Paid';
          else if (paid > 0) payStatus = 'Partial';
          else payStatus = 'Unpaid';
        }
        list.push({
          id: s.id,
          invoiceNumber: s.invoiceNumber || `INV-${s.id}`,
          reference: s.reference,
          customerName: s.customerName || 'Walk-in Customer',
          customerPhone: (s as any).customerPhone || '',
          customerAddress: (s as any).customerAddress || '',
          customerGstin: (s as any).customerGstin || '',
          date: s.date || (s.createdAt ? s.createdAt.split('T')[0] : ''),
          subtotal: Number(s.subtotal || 0),
          discount: Number(s.discount || 0),
          orderTax: Number(s.orderTax || 0),
          gst: Number((s.orderTax || 0) + (s.gst || 0)),
          shipping: Number(s.shipping || 0),
          total,
          paid,
          due,
          status: s.status || 'Completed',
          paymentStatus: payStatus,
          biller: s.biller || 'Admin',
          notes: s.notes,
          items: s.items || [],
          previousDue: s.previousDue,
          advancePayment: s.advancePayment,
          showPreviousBalance: s.showPreviousBalance,
          syncStatus: s.syncStatus || 'synced',
        });
      }
      return list;
    }
    return fallbackInvoices.filter((item) => !dismissedInvoiceIds.includes(item.id));
  }, [dbSales, fallbackInvoices, dismissedInvoiceIds]);

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
    setDeleteError(null);
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const numericId = parseInt(String(deleteTarget.id), 10);
      const targetId = !isNaN(numericId) ? numericId : deleteTarget.id;
      await deleteSaleMutation.mutateAsync(targetId);
      setDismissedInvoiceIds((prev) => [...prev, String(deleteTarget.id)]);
      setDeleteTarget(null);
      refetch();
    } catch (err: any) {
      console.error('Failed to delete sale bill:', err);
      setDeleteError(err?.message || 'Server failed to delete invoice');
    } finally {
      setIsDeleting(false);
    }
  };

  const loadInvoiceItems = async (invoice: any) => {
    if (!invoice) return [];
    let invItems: any[] = [];

    // 1. If server ID, fetch fresh verified items from API
    if (/^\d+$/.test(String(invoice.id)) && Number(invoice.id) > 0 && Number(invoice.id) < 1000000000000) {
      try {
        const serverSale = await saleRepository.fetchByIdFromApi(Number(invoice.id));
        if (serverSale?.items && serverSale.items.length > 0) {
          invItems = serverSale.items;
        }
      } catch (err) {
        console.warn('Server fetch items fallback to local:', err);
      }
    }

    // 2. Fallback to invoice.items
    if ((!invItems || invItems.length === 0) && invoice.items && invoice.items.length > 0) {
      invItems = invoice.items;
    }

    // 3. Fallback to local DB getItemsForSale
    if ((!invItems || invItems.length === 0) && invoice.id) {
      invItems = await saleRepository.getItemsForSale(Number(invoice.id));
    }

    // 4. Strict filter: must belong to this invoice, quantity > 0, deduplicate by productId
    const itemsMap = new Map<string, any>();
    for (const it of (invItems || [])) {
      if (!it) continue;
      if (it.saleId !== undefined && it.saleId !== null && invoice.id && Number(it.saleId) !== Number(invoice.id)) {
        continue;
      }
      const qty = Number(it.quantity) || 0;
      if (qty <= 0) continue;

      const pKey = String(it.productId || it.productName);
      if (!itemsMap.has(pKey) || (Number(it.total) > 0 && Number(itemsMap.get(pKey).total) === 0)) {
        itemsMap.set(pKey, it);
      }
    }

    return Array.from(itemsMap.values());
  };

  const handleOpenPrintPreview = async (invoice: any) => {
    if (!invoice) return;
    const invItems = await loadInvoiceItems(invoice);

    const itemsForPrint = invItems && invItems.length > 0
      ? invItems.map((i: any) => ({
          productId: i.productId,
          productName: i.productName || `Product #${i.productId || 1}`,
          sku: i.sku,
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
      previousDue: invoice.previousDue !== undefined ? Number(invoice.previousDue) : undefined,
      advancePayment: invoice.advancePayment !== undefined ? Number(invoice.advancePayment) : undefined,
      showPreviousBalance: invoice.showPreviousBalance !== undefined ? Boolean(invoice.showPreviousBalance) : (Number(invoice.previousDue || 0) > 0 || Number(invoice.advancePayment || 0) > 0),
      paymentMethod: invoice.paymentMethod || 'Cash',
      items: itemsForPrint,
    };

    setPrintData(rData);
    setShowPrintModal(true);
  };

  const handleViewInvoice = async (invoice: any) => {
    if (!invoice) return;
    const invItems = await loadInvoiceItems(invoice);
    setViewInvoice({ ...invoice, items: invItems });
  };

  const handleOpenShare = async (invoice: any) => {
    if (!invoice) return;
    const invItems = await loadInvoiceItems(invoice);
    setShareData({ ...invoice, items: invItems });
    setShowShareModal(true);
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
      width: 160,
      render: (_: any, item: any) => (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable onPress={() => handleOpenPrintPreview(item)} style={{ padding: 4 }}>
            <Printer size={16} color={theme.colors.primary} />
          </Pressable>
          <Pressable onPress={() => handleOpenShare(item)} style={{ padding: 4 }}>
            <Share2 size={16} color="#10B981" />
          </Pressable>
          <Pressable
            onPress={() => {
              setEditSaleId(item.id);
              setShowAddModal(true);
            }}
            style={{ padding: 4 }}
          >
            <Edit size={16} color="#F59E0B" />
          </Pressable>
          <Pressable onPress={() => handleViewInvoice(item)} style={{ padding: 4 }}>
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
                  {viewInvoice.showPreviousBalance && Number(viewInvoice.previousDue || 0) > 0 ? (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 4 }}>
                        <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 14 }}>Current Bill:</Text>
                        <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 14 }}>₹{Number(viewInvoice.total).toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#EF4444', fontWeight: '600' }}>Previous Due:</Text>
                        <Text style={{ color: '#EF4444', fontWeight: '600' }}>+₹{Number(viewInvoice.previousDue).toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 4 }}>
                        <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>Total Payable:</Text>
                        <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 18 }}>₹{(Number(viewInvoice.total) + Number(viewInvoice.previousDue)).toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#10B981', fontWeight: '600' }}>Amount Paid:</Text>
                        <Text style={{ color: '#10B981', fontWeight: '600' }}>₹{Number(viewInvoice.paid).toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#EF4444', fontWeight: '700' }}>Net Balance Due:</Text>
                        <Text style={{ color: '#EF4444', fontWeight: '700' }}>₹{Math.max(0, Number(viewInvoice.total) + Number(viewInvoice.previousDue) - Number(viewInvoice.paid)).toFixed(2)}</Text>
                      </View>
                    </>
                  ) : viewInvoice.showPreviousBalance && Number(viewInvoice.advancePayment || 0) > 0 ? (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 4 }}>
                        <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 14 }}>Current Bill:</Text>
                        <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 14 }}>₹{Number(viewInvoice.total).toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#10B981', fontWeight: '600' }}>Advance Credit:</Text>
                        <Text style={{ color: '#10B981', fontWeight: '600' }}>-₹{Math.min(Number(viewInvoice.advancePayment), Number(viewInvoice.total)).toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 4 }}>
                        <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>Net Payable:</Text>
                        <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 18 }}>₹{Math.max(0, Number(viewInvoice.total) - Math.min(Number(viewInvoice.advancePayment), Number(viewInvoice.total))).toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#10B981', fontWeight: '600' }}>Amount Paid:</Text>
                        <Text style={{ color: '#10B981', fontWeight: '600' }}>₹{Number(viewInvoice.paid).toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Balance Due:</Text>
                        <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>₹{Math.max(0, Math.max(0, Number(viewInvoice.total) - Math.min(Number(viewInvoice.advancePayment), Number(viewInvoice.total))) - Number(viewInvoice.paid)).toFixed(2)}</Text>
                      </View>
                      {Number(viewInvoice.advancePayment) > Number(viewInvoice.total) && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ color: '#3B82F6', fontWeight: '600' }}>Remaining Advance:</Text>
                          <Text style={{ color: '#3B82F6', fontWeight: '600' }}>₹{(Number(viewInvoice.advancePayment) - Number(viewInvoice.total)).toFixed(2)}</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </View>
              </ScrollView>

              {/* Modal footer with Share and Print actions */}
              <View style={[styles.modalFooter, { borderTopColor: theme.colors.border, gap: 10 }]}>
                <Pressable
                  style={[styles.printButton, { backgroundColor: '#10B981' }]}
                  onPress={() => {
                    handleOpenShare(viewInvoice);
                  }}
                >
                  <Share2 size={16} color="white" />
                  <Text style={{ color: 'white', fontWeight: '600' }}>Share</Text>
                </Pressable>
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
        onClose={() => {
          setShowPrintModal(false);
          setPrintData(null);
        }}
      />

      <ShareSaleModal
        visible={showShareModal}
        sale={shareData}
        onClose={() => {
          setShowShareModal(false);
          setShareData(null);
        }}
        onOpenFullPreview={() => {
          setShowShareModal(false);
          handleOpenPrintPreview(shareData);
        }}
      />

      <AddSalesModal
        visible={showAddModal}
        editSaleId={editSaleId}
        onClose={() => {
          setShowAddModal(false);
          setEditSaleId(null);
          refetch();
        }}
      />

      <SweetConfirmModal
        visible={!!deleteTarget}
        type={deleteError ? 'error' : 'danger'}
        title="Delete Sales Invoice"
        subtitle="Are you sure you want to permanently delete this sales invoice? The deletion will sync immediately with the server."
        entityName={
          deleteTarget
            ? `${deleteTarget.invoiceNumber || deleteTarget.reference || deleteTarget.id} • ${deleteTarget.customerName || 'Customer'} (₹${Number(deleteTarget.total || 0).toFixed(2)})`
            : undefined
        }
        sideEffects={[
          {
            icon: 'stock',
            title: 'Inventory Stock Restoration',
            description: 'Quantities sold in this invoice will be added back into warehouse stock.',
          },
          {
            icon: 'wallet',
            title: 'Customer Ledger Balance Adjustment',
            description: 'Any unpaid due recorded on this invoice will be deducted from customer account.',
          },
          {
            icon: 'server',
            title: 'Permanent Server Deletion',
            description: 'Invoice and associated payment transactions will be removed on the server.',
          },
        ]}
        confirmText="Yes, Delete Bill"
        cancelText="Cancel"
        isConfirming={isDeleting}
        errorMessage={deleteError}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(null);
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
