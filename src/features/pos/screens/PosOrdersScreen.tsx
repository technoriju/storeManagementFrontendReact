import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, Image, Modal, Alert, ScrollView } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { PosScreenType } from '../POSModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { useSyncStore } from '../../../core/sync/useSyncStore';
import { AddSalesModal } from '../components/AddSalesModal';
import { useSales, useDeleteSale } from '../api/useSales';
import { saleRepository } from '../../../core/repositories/SaleRepository';
import { 
  FileText, 
  FileSpreadsheet, 
  RefreshCw, 
  ChevronUp, 
  PlusCircle, 
  ChevronDown,
  MoreVertical,
  Eye,
  Trash2,
  X,
  Printer,
} from 'lucide-react-native';
import { ReceiptPrintPreviewModal, ReceiptPrintData } from '../components/ReceiptPrintPreviewModal';

interface Props {
  onNavigate: (screen: PosScreenType, id?: string) => void;
}

const MenuItem = ({ icon, label, onPress }: any) => (
  <Pressable style={styles.menuItem} onPress={onPress}>
    {icon}
    <Text style={styles.menuItemText}>{label}</Text>
  </Pressable>
);

const ActionMenu = ({
  item,
  theme,
  onDelete,
  onView,
  onPrint,
}: {
  item: any;
  theme: any;
  onDelete: (item: any) => void;
  onView: (item: any) => void;
  onPrint: (item: any) => void;
}) => {
  const [visible, setVisible] = useState(false);
  const [layout, setLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const buttonRef = useRef<any>(null);

  const openMenu = () => {
    buttonRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      setLayout({ x, y, width, height });
      setVisible(true);
    });
  };

  return (
    <>
      <View ref={buttonRef} collapsable={false}>
        <Pressable style={{ padding: 4 }} onPress={openMenu}>
          <MoreVertical size={20} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
      <Modal visible={visible} transparent={true} animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
          <View style={[styles.popover, { 
            top: layout.y + layout.height,
            left: layout.x - 160 + layout.width,
            backgroundColor: theme.colors.surface || 'white',
            borderColor: theme.colors.border,
          }]}>
            <MenuItem
              icon={<Eye size={16} color={theme.colors.primary} />}
              label="View Order"
              onPress={() => {
                setVisible(false);
                onView(item);
              }}
            />
            <MenuItem
              icon={<Printer size={16} color="#2563EB" />}
              label="Print Receipt"
              onPress={() => {
                setVisible(false);
                onPrint(item);
              }}
            />
            <MenuItem
              icon={<Trash2 size={16} color="#EF4444" />}
              label="Delete Sale"
              onPress={() => {
                setVisible(false);
                onDelete(item);
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

export const PosOrdersScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [printOrderData, setPrintOrderData] = useState<ReceiptPrintData | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const { data: dbSales = [], isLoading, refetch } = useSales();
  const deleteSaleMutation = useDeleteSale();
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  useEffect(() => {
    refetch();
  }, [lastSyncedAt, refetch]);

  const loadOrderItems = async (order: any) => {
    if (!order) return [];
    let ordItems: any[] = [];

    // 1. If server ID, fetch fresh verified items from API
    if (/^\d+$/.test(String(order.id)) && Number(order.id) > 0 && Number(order.id) < 1000000000000) {
      try {
        const serverSale = await saleRepository.fetchByIdFromApi(Number(order.id));
        if (serverSale?.items && serverSale.items.length > 0) {
          ordItems = serverSale.items;
        }
      } catch (err) {
        console.warn('Server fetch items fallback to local:', err);
      }
    }

    // 2. Fallback to order.items
    if ((!ordItems || ordItems.length === 0) && order.items && order.items.length > 0) {
      ordItems = order.items;
    }

    // 3. Fallback to local DB getItemsForSale
    if ((!ordItems || ordItems.length === 0) && order.id) {
      ordItems = await saleRepository.getItemsForSale(Number(order.id));
    }

    // 4. Strict filter: must belong to this sale, quantity > 0, deduplicate by productId
    const itemsMap = new Map<string, any>();
    for (const it of (ordItems || [])) {
      if (!it) continue;
      if (it.saleId !== undefined && it.saleId !== null && order.id && Number(it.saleId) !== Number(order.id)) {
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

  const handleOpenPrintPreview = async (order: any) => {
    if (!order) return;
    const ordItems = await loadOrderItems(order);

    const itemsForPrint = ordItems && ordItems.length > 0
      ? ordItems.map((i: any) => ({
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
            unitPrice: Number(order.grandTotal || order.total || 0),
            discount: 0,
            gst: 0,
            total: Number(order.grandTotal || order.total || 0),
            unit: 'Unit',
          },
        ];

    const rData: ReceiptPrintData = {
      invoiceNumber: order.reference || `ORD-${order.id}`,
      reference: order.reference,
      date: order.date,
      customerName: order.customerName || 'Walk-in Customer',
      customerPhone: order.customerPhone || '',
      customerAddress: order.customerAddress || '',
      customerGstin: order.customerGstin || '',
      customerType: (order.customerGstin && order.customerGstin.length > 3) ? 'wholesale' : 'retail',
      biller: order.biller || 'Cashier',
      subtotal: Number(order.subtotal || order.grandTotal || 0),
      discount: Number(order.discount || 0),
      gst: Number(order.gst || 0),
      total: Number(order.grandTotal || order.total || 0),
      paid: Number(order.paid !== undefined ? order.paid : (order.grandTotal || order.total || 0)),
      due: Number(order.due !== undefined ? order.due : 0),
      paymentMethod: order.paymentMethod || 'Cash',
      items: itemsForPrint,
    };

    setPrintOrderData(rData);
    setShowPrintModal(true);
  };

  const handleViewOrder = async (order: any) => {
    if (!order) return;
    const ordItems = await loadOrderItems(order);
    setSelectedOrder({ ...order, items: ordItems });
  };

  // Initial demo orders if DB has no sales yet
  const fallbackOrders = useMemo(() => [
    { id: '1', customerName: 'Carl Evans', avatar: 'https://i.pravatar.cc/150?u=1', reference: 'SL001', date: '2024-12-24', status: 'Completed', grandTotal: 1000, paid: 1000, due: 0, paymentStatus: 'Paid', biller: 'Admin', syncStatus: 'synced' },
    { id: '2', customerName: 'Minerva Rameriz', avatar: 'https://i.pravatar.cc/150?u=2', reference: 'SL002', date: '2024-12-10', status: 'Pending', grandTotal: 1500, paid: 0, due: 1500, paymentStatus: 'Unpaid', biller: 'Admin', syncStatus: 'synced' },
    { id: '3', customerName: 'Robert Lamon', avatar: 'https://i.pravatar.cc/150?u=3', reference: 'SL003', date: '2023-02-08', status: 'Completed', grandTotal: 1500, paid: 0, due: 1500, paymentStatus: 'Paid', biller: 'Admin', syncStatus: 'synced' },
    { id: '4', customerName: 'Patricia Lewis', avatar: 'https://i.pravatar.cc/150?u=4', reference: 'SL004', date: '2023-02-12', status: 'Completed', grandTotal: 2000, paid: 1000, due: 1000, paymentStatus: 'Overdue', biller: 'Admin', syncStatus: 'synced' },
    { id: '5', customerName: 'Mark Joslyn', avatar: 'https://i.pravatar.cc/150?u=5', reference: 'SL005', date: '2023-03-17', status: 'Completed', grandTotal: 800, paid: 800, due: 0, paymentStatus: 'Paid', biller: 'Admin', syncStatus: 'synced' },
  ], []);

  const allOrders = useMemo(() => {
    if (dbSales && dbSales.length > 0) {
      const seen = new Set<string>();
      const list: any[] = [];
      for (const s of dbSales) {
        const invNum = (s.invoiceNumber || s.reference || String(s.id)).trim();
        if (invNum && seen.has(invNum)) continue;
        if (invNum) seen.add(invNum);

        list.push({
          id: String(s.id),
          customerName: s.customerName || 'Walk-in Customer',
          customerPhone: (s as any).customerPhone || '',
          customerAddress: (s as any).customerAddress || '',
          customerGstin: (s as any).customerGstin || '',
          avatar: `https://i.pravatar.cc/150?u=${s.id}`,
          reference: s.reference || s.invoiceNumber || `SL-${s.id}`,
          date: s.date || s.createdAt?.split('T')[0] || '',
          subtotal: Number(s.subtotal || 0),
          discount: Number(s.discount || 0),
          gst: Number((s.orderTax || 0) + (s.gst || 0)),
          orderTax: Number(s.orderTax || 0),
          shipping: Number(s.shipping || 0),
          status: s.status || 'Completed',
          grandTotal: Number(s.total || 0),
          paid: Number(s.paid || 0),
          due: Number(s.due || 0),
          paymentStatus: s.paymentStatus || 'Unpaid',
          biller: s.biller || 'Admin',
          items: s.items || [],
          syncStatus: s.syncStatus || 'synced',
        });
      }
      return list;
    }
    return fallbackOrders;
  }, [dbSales, fallbackOrders]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return allOrders;
    const q = searchQuery.toLowerCase().trim();
    return allOrders.filter((item) =>
      item.customerName?.toLowerCase().includes(q) ||
      item.reference?.toLowerCase().includes(q) ||
      item.status?.toLowerCase().includes(q) ||
      item.paymentStatus?.toLowerCase().includes(q) ||
      item.biller?.toLowerCase().includes(q)
    );
  }, [allOrders, searchQuery]);

  const handleDelete = (item: any) => {
    Alert.alert(
      'Delete Sale',
      `Are you sure you want to delete order ${item.reference}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const numericId = parseInt(item.id, 10);
            if (!isNaN(numericId) && numericId > 10) {
              await deleteSaleMutation.mutateAsync(numericId);
            } else {
              Alert.alert('Notice', 'Demo record cannot be deleted from database.');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return { bg: '#10B981', text: 'white' };
      case 'Pending': return { bg: '#0EA5E9', text: 'white' };
      default: return { bg: theme.colors.border, text: theme.colors.text };
    }
  };

  const getPaymentStatusStyle = (status: string) => {
    switch (status) {
      case 'Paid': return { bg: '#ECFDF5', text: '#10B981', dot: '#10B981' };
      case 'Unpaid': return { bg: '#FEF2F2', text: '#EF4444', dot: '#EF4444' };
      case 'Overdue': return { bg: '#FFFBEB', text: '#F59E0B', dot: '#F59E0B' };
      default: return { bg: theme.colors.background, text: theme.colors.textSecondary, dot: 'transparent' };
    }
  };

  const columns = [
    { 
      key: 'customer', 
      title: 'Customer Name', 
      flex: 1.5,
      minWidth: 160,
      render: (_: any, item: any) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image source={{ uri: item.avatar }} style={{ width: 28, height: 28, borderRadius: 14 }} />
          <Text style={{ color: theme.colors.text, fontWeight: '500' }}>{item.customerName}</Text>
        </View>
      )
    },
    { 
      key: 'reference', 
      title: 'Reference', 
      flex: 1,
      minWidth: 100,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
    },
    { 
      key: 'date', 
      title: 'Date', 
      flex: 1,
      minWidth: 100,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
    },
    { 
      key: 'status', 
      title: 'Status', 
      width: 100,
      render: (value: string) => {
        const colors = getStatusColor(value);
        return (
          <View style={{ backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start' }}>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{value}</Text>
          </View>
        );
      }
    },
    { 
      key: 'grandTotal', 
      title: 'Grand Total', 
      width: 110,
      render: (value: number) => <Text style={{ color: theme.colors.text, fontWeight: '600' }}>₹{value?.toFixed(2)}</Text>
    },
    { 
      key: 'paid', 
      title: 'Paid', 
      width: 90,
      render: (value: number) => <Text style={{ color: '#10B981' }}>₹{value?.toFixed(2)}</Text>
    },
    { 
      key: 'due', 
      title: 'Due', 
      width: 90,
      render: (value: number) => <Text style={{ color: value > 0 ? '#EF4444' : theme.colors.textSecondary }}>₹{value?.toFixed(2)}</Text>
    },
    { 
      key: 'paymentStatus', 
      title: 'Payment Status', 
      width: 120,
      render: (value: string) => {
        const style = getPaymentStatusStyle(value);
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: style.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: style.dot }} />
            <Text style={{ color: style.text, fontSize: 12, fontWeight: '600' }}>{value}</Text>
          </View>
        );
      }
    },
    { 
      key: 'biller', 
      title: 'Biller', 
      width: 90,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
    },
    { 
      key: 'syncStatus', 
      title: 'Sync', 
      width: 100,
      render: (value: string | undefined) => <SyncBadge status={value} />
    },
  ];

  const headerActions = (
    <>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]} onPress={() => refetch()}>
        <RefreshCw size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable 
        style={[styles.primaryActionBtn, { backgroundColor: '#F97316' }]} 
        onPress={() => setShowAddModal(true)}
      >
        <PlusCircle size={16} color="white" />
        <Text style={styles.primaryActionText}>Add Sales</Text>
      </Pressable>
    </>
  );

  const filters = (
    <>
      <View style={[styles.filterDropdown, { borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.text }}>Status</Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
      </View>
    </>
  );

  const renderRowActions = (item: any) => (
    <ActionMenu
      item={item}
      theme={theme}
      onDelete={handleDelete}
      onView={handleViewOrder}
      onPrint={handleOpenPrintPreview}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AdvancedTable
        title="POS Orders"
        subtitle="Manage your pos orders and sales transactions"
        headerActions={headerActions}
        columns={columns}
        data={filteredOrders}
        onSearch={setSearchQuery}
        filters={filters}
        renderRowActions={renderRowActions}
        isLoading={isLoading}
      />
      <AddSalesModal visible={showAddModal} onClose={() => setShowAddModal(false)} />

      {selectedOrder && (
        <Modal visible={!!selectedOrder} transparent animationType="fade">
          <View style={[styles.modalOverlayCenter, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Order #{selectedOrder.reference}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Customer: {selectedOrder.customerName}</Text>
                </View>
                <Pressable onPress={() => setSelectedOrder(null)}>
                  <X size={20} color={theme.colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={{ padding: 16, maxHeight: 400 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ color: theme.colors.textSecondary }}>Date: {selectedOrder.date}</Text>
                  <Text style={{ color: theme.colors.textSecondary }}>Status: {selectedOrder.status}</Text>
                </View>

                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '600', marginBottom: 6 }}>Ordered Items:</Text>
                    {selectedOrder.items.map((i: any, idx: number) => (
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
                    <Text style={{ color: theme.colors.textSecondary }}>Grand Total:</Text>
                    <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 16 }}>₹{Number(selectedOrder.grandTotal).toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#10B981', fontWeight: '500' }}>Paid:</Text>
                    <Text style={{ color: '#10B981', fontWeight: '500' }}>₹{Number(selectedOrder.paid).toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: selectedOrder.due > 0 ? '#EF4444' : theme.colors.textSecondary, fontWeight: '500' }}>Due:</Text>
                    <Text style={{ color: selectedOrder.due > 0 ? '#EF4444' : theme.colors.textSecondary, fontWeight: '500' }}>₹{Number(selectedOrder.due).toFixed(2)}</Text>
                  </View>
                </View>
              </ScrollView>

              {/* Modal Footer with Print Action */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                <Pressable
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#2563EB' }}
                  onPress={() => {
                    handleOpenPrintPreview(selectedOrder);
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
        data={printOrderData}
        onClose={() => {
          setShowPrintModal(false);
          setPrintOrderData(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1 },
  modalOverlayCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalBox: { width: '90%', maxWidth: 500, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: 'bold' },
  popover: {
    position: 'absolute',
    width: 150,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 10,
  },
  menuItemText: { fontSize: 13, color: '#1E293B' },
  container: { flex: 1 },
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
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 6,
    gap: 8,
  },
  primaryActionText: { color: 'white', fontWeight: '600', fontSize: 13 },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 36,
    backgroundColor: 'white',
    marginRight: 8,
  },
});
