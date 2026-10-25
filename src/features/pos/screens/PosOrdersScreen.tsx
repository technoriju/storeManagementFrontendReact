import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, Image, Modal, Alert, ScrollView, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { PosScreenType } from '../POSModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { useSyncStore } from '../../../core/sync/useSyncStore';
import { AddSalesModal } from '../components/AddSalesModal';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
import { useDeleteSale, fetchPaginatedSales } from '../api/useSales';
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
  Edit,
  Trash2,
  X,
  Printer,
  Share2,
} from 'lucide-react-native';
import { ReceiptPrintPreviewModal, ReceiptPrintData } from '../components/ReceiptPrintPreviewModal';
import { ShareSaleModal } from '../components/ShareSaleModal';
import { SweetConfirmModal } from '../../../shared/components/feedback/SweetConfirmModal';
import { enrichSaleItemsWithProductMeta } from '../utils/enrichSaleItems';

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
  onEdit,
  onView,
  onPrint,
  onShare,
}: {
  item: any;
  theme: any;
  onDelete: (item: any) => void;
  onEdit: (item: any) => void;
  onView: (item: any) => void;
  onPrint: (item: any) => void;
  onShare: (item: any) => void;
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
              icon={<Share2 size={16} color="#10B981" />}
              label="Share Sale"
              onPress={() => {
                setVisible(false);
                onShare(item);
              }}
            />
            <MenuItem
              icon={<Edit size={16} color="#F59E0B" />}
              label="Edit Sale"
              onPress={() => {
                setVisible(false);
                onEdit(item);
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
  const { isMobile, windowWidth } = useResponsive();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [tableOrders, setTableOrders] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editSaleId, setEditSaleId] = useState<number | string | null>(null);
  const [dismissedOrderIds, setDismissedOrderIds] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [printOrderData, setPrintOrderData] = useState<ReceiptPrintData | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [shareOrderData, setShareOrderData] = useState<any | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const deleteSaleMutation = useDeleteSale();
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

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

    const filtered = Array.from(itemsMap.values());
    return await enrichSaleItemsWithProductMeta(filtered);
  };

  const handleOpenPrintPreview = async (order: any) => {
    if (!order) return;
    const ordItems = await loadOrderItems(order);

    const itemsForPrint = ordItems && ordItems.length > 0
      ? ordItems.map((i: any) => ({
          productId: i.productId,
          productName: i.productName || `Product #${i.productId || 1}`,
          sku: i.sku,
          brand: i.brand || i.brandName || i.product?.brandName,
          brandName: i.brandName || i.brand || i.product?.brandName,
          subUnit: i.subUnit || i.subUnitName || i.product?.subUnitName,
          subUnitName: i.subUnitName || i.subUnit || i.product?.subUnitName,
          conversionRate: i.conversionRate !== undefined ? Number(i.conversionRate) : (i.product?.conversionRate ? Number(i.product.conversionRate) : undefined),
          baseUnitName: i.baseUnitName || i.product?.baseUnitName || i.product?.unitName || i.unit,
          unitType: i.unitType,
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
          discount: Number(i.discount) || 0,
          gst: Number(i.gst) || 0,
          taxAmount: Number(i.taxAmount) || 0,
          total: Number(i.total) || 0,
          unit: i.unit || i.product?.unitName || i.product?.baseUnitName || 'Pcs',
          product: i.product,
          productUnit: i.productUnit,
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
      customerName: order.customer?.name || order.customerName || 'Walk-in Customer',
      customerPhone: (order as any).customer?.phone || order.customerPhone || '',
      customerAddress: (order as any).customer?.address || order.customerAddress || '',
      customerGstin: (order as any).customer?.taxNumber || (order as any).customer?.taxId || (order as any).customer?.gstin || order.customerGstin || '',
      customerType: ((order as any).customer?.taxNumber || (order as any).customer?.gstin || order.customerGstin) ? 'wholesale' : 'retail',
      biller: order.biller || 'Cashier',
      subtotal: Number(order.subtotal || order.grandTotal || 0),
      discount: Number(order.discount || 0),
      gst: Number(order.gst || 0),
      shipping: Number(order.shipping || 0),
      total: Number(order.grandTotal || order.total || 0),
      paid: Number(order.paid !== undefined ? order.paid : (order.grandTotal || order.total || 0)),
      due: Number(order.due !== undefined ? order.due : 0),
      paymentMethod: order.paymentMethod || 'Cash',
      previousDue: order.previousDue !== undefined ? Number(order.previousDue) : undefined,
      advancePayment: order.advancePayment !== undefined ? Number(order.advancePayment) : undefined,
      showPreviousBalance: order.showPreviousBalance !== undefined ? Boolean(order.showPreviousBalance) : (Number(order.previousDue || 0) > 0 || Number(order.advancePayment || 0) > 0),
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

  const handleOpenShare = async (order: any) => {
    if (!order) return;
    const ordItems = await loadOrderItems(order);
    setShareOrderData({ ...order, items: ordItems });
    setShowShareModal(true);
  };

  const loadData = useCallback(async (targetPage: number, targetLimit: number, targetSearch: string) => {
    setIsLoadingData(true);
    try {
      const res = await fetchPaginatedSales({
        page: targetPage,
        limit: targetLimit,
        search: targetSearch,
      });

      if (res.data.length > 0 || targetSearch) {
        const seen = new Set<string>();
        const list: any[] = [];
        for (const s of res.data) {
          if (dismissedOrderIds.includes(String(s.id))) continue;
          const invNum = (s.invoiceNumber || s.reference || String(s.id)).trim();
          if (invNum && seen.has(invNum)) continue;
          if (invNum) seen.add(invNum);

          list.push({
            id: String(s.id),
            customerName: s.customer?.name || s.customerName || 'Walk-in Customer',
            customerPhone: (s as any).customer?.phone || (s as any).customerPhone || '',
            customerAddress: (s as any).customer?.address || (s as any).customerAddress || '',
            customerGstin: (s as any).customer?.taxNumber || (s as any).customer?.taxId || (s as any).customer?.gstin || (s as any).customerGstin || '',
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
            previousDue: s.previousDue !== undefined ? Number(s.previousDue) : 0,
            advancePayment: s.advancePayment !== undefined ? Number(s.advancePayment) : 0,
            showPreviousBalance: s.showPreviousBalance !== undefined ? Boolean(s.showPreviousBalance) : (Number(s.previousDue || 0) > 0 || Number(s.advancePayment || 0) > 0),
            syncStatus: s.syncStatus || 'synced',
          });
        }
        setTableOrders(list);
        setTotalItems(res.total);
        setTotalPages(res.totalPages);
      } else {
        setTableOrders([]);
        setTotalItems(0);
        setTotalPages(1);
      }
    } catch (e) {
      console.warn('Failed to load paginated orders:', e);
    } finally {
      setIsLoadingData(false);
    }
  }, [dismissedOrderIds]);

  useEffect(() => {
    loadData(page, rowsPerPage, searchQuery);
  }, [loadData, page, rowsPerPage, searchQuery]);

  useEffect(() => {
    if (lastSyncedAt) {
      loadData(page, rowsPerPage, searchQuery);
    }
  }, [loadData, lastSyncedAt, page, rowsPerPage, searchQuery]);

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
      setDismissedOrderIds((prev) => [...prev, String(deleteTarget.id)]);
      setDeleteTarget(null);
      await loadData(page, rowsPerPage, searchQuery);
    } catch (err: any) {
      console.error('Failed to delete sale order:', err);
      setDeleteError(err?.message || 'Server failed to delete sale order');
    } finally {
      setIsDeleting(false);
    }
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

  const isSmallMobile = isMobile && windowWidth < 380;
  const actionIconSize = isMobile ? (isSmallMobile ? 14 : 15) : 16;
  const addBtnLabel = !isMobile ? 'Add Sales' : (windowWidth >= 480 ? 'Add Sales' : 'Add');

  const filteredOrders = useMemo(() => {
    if (!selectedStatus) return tableOrders;
    return tableOrders.filter((o) => o.status?.toLowerCase() === selectedStatus.toLowerCase());
  }, [tableOrders, selectedStatus]);

  const statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Pending', value: 'Pending' },
  ];

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
        onPress={() => loadData(page, rowsPerPage, searchQuery)}
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
        onPress={() => setShowAddModal(true)}
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

  const filters = (
    <View style={[styles.filtersWrapper, isMobile && { width: '100%' }]}>
      <AppSelect
        placeholder="Status"
        value={selectedStatus}
        options={statusOptions}
        onSelect={(val) => {
          setSelectedStatus(val ? String(val) : '');
          setPage(1);
        }}
        clearable
        containerStyle={[
          styles.filterSelect,
          isMobile ? { flex: 1, minWidth: 0 } : { width: 140 }
        ]}
      />
      {!!selectedStatus && (
        <Pressable
          style={[styles.clearFilterBtn, { borderColor: theme.colors.border }]}
          onPress={() => setSelectedStatus('')}
        >
          <X size={14} color="#EF4444" />
          <Text style={styles.clearFilterText}>Reset</Text>
        </Pressable>
      )}
    </View>
  );

  const renderRowActions = (item: any) => (
    <ActionMenu
      item={item}
      theme={theme}
      onDelete={handleDelete}
      onEdit={(order) => {
        setEditSaleId(order.id);
        setShowAddModal(true);
      }}
      onView={handleViewOrder}
      onPrint={handleOpenPrintPreview}
      onShare={handleOpenShare}
    />
  );

  const renderOrderCard = (item: any) => {
    const statusCol = getStatusColor(item.status);
    const payStyle = getPaymentStatusStyle(item.paymentStatus);
    return (
      <View style={[styles.mobileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
            <Image source={{ uri: item.avatar }} style={{ width: 32, height: 32, borderRadius: 16 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
                {item.customerName}
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                {item.reference} • {item.date}
              </Text>
            </View>
          </View>
          <SyncBadge status={item.syncStatus} />
        </View>

        <View style={styles.cardBadgeRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusCol.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusCol.text }]}>{item.status}</Text>
          </View>
          <View style={[styles.paymentBadge, { backgroundColor: payStyle.bg }]}>
            <View style={[styles.dot, { backgroundColor: payStyle.dot }]} />
            <Text style={[styles.paymentBadgeText, { color: payStyle.text }]}>{item.paymentStatus}</Text>
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: theme.colors.divider }]}>
          <View>
            <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>Grand Total</Text>
            <Text style={[styles.cardPrice, { color: theme.colors.text }]}>₹{item.grandTotal?.toFixed(2)}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>Due</Text>
            <Text style={[styles.cardDue, { color: item.due > 0 ? '#EF4444' : theme.colors.textSecondary }]}>
              ₹{item.due?.toFixed(2)}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <ActionMenu
              item={item}
              theme={theme}
              onDelete={handleDelete}
              onEdit={(order) => {
                setEditSaleId(order.id);
                setShowAddModal(true);
              }}
              onView={handleViewOrder}
              onPrint={handleOpenPrintPreview}
              onShare={handleOpenShare}
            />
          </View>
        </View>
      </View>
    );
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setPage(1);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, padding: isMobile ? 8 : 16 }]}>
      <AdvancedTable
        title="POS Orders"
        subtitle="Manage your pos orders and sales transactions"
        headerActions={headerActions}
        columns={columns}
        data={filteredOrders}
        searchValue={searchQuery}
        onSearch={handleSearch}
        debounceSearchMs={400}
        filters={filters}
        renderRowActions={renderRowActions}
        renderMobileCard={renderOrderCard}
        isLoading={isLoadingData}
        page={page}
        rowsPerPage={rowsPerPage}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={(newPage) => setPage(newPage)}
        onRowsPerPageChange={(newRows) => {
          setRowsPerPage(newRows);
          setPage(1);
        }}
      />


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
                  {Number(selectedOrder.subtotal || 0) > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.colors.textSecondary }}>Subtotal:</Text>
                      <Text style={{ color: theme.colors.text }}>₹{Number(selectedOrder.subtotal).toFixed(2)}</Text>
                    </View>
                  )}
                  {Number(selectedOrder.discount || 0) > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.colors.textSecondary }}>Discount:</Text>
                      <Text style={{ color: '#EF4444' }}>-₹{Number(selectedOrder.discount).toFixed(2)}</Text>
                    </View>
                  )}
                  {Number(selectedOrder.gst || 0) > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.colors.textSecondary }}>Taxes & GST:</Text>
                      <Text style={{ color: theme.colors.text }}>₹{Number(selectedOrder.gst).toFixed(2)}</Text>
                    </View>
                  )}
                  {Number(selectedOrder.shipping || 0) > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.colors.textSecondary }}>Shipping:</Text>
                      <Text style={{ color: theme.colors.text }}>+₹{Number(selectedOrder.shipping).toFixed(2)}</Text>
                    </View>
                  )}
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

              {/* Modal Footer with Share and Print Actions */}
              <View style={[
                { flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
                isMobile && { alignItems: 'stretch' }
              ]}>
                <Pressable
                  style={[
                    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#10B981' },
                    isMobile && { width: '100%' }
                  ]}
                  onPress={() => {
                    handleOpenShare(selectedOrder);
                  }}
                >
                  <Share2 size={16} color="white" />
                  <Text style={{ color: 'white', fontWeight: '600' }}>Share</Text>
                </Pressable>
                <Pressable
                  style={[
                    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#2563EB' },
                    isMobile && { width: '100%' }
                  ]}
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

      <ShareSaleModal
        visible={showShareModal}
        sale={shareOrderData}
        onClose={() => {
          setShowShareModal(false);
          setShareOrderData(null);
        }}
        onOpenFullPreview={() => {
          setShowShareModal(false);
          handleOpenPrintPreview(shareOrderData);
        }}
      />

      <AddSalesModal
        visible={showAddModal}
        editSaleId={editSaleId}
        onClose={() => {
          setShowAddModal(false);
          setEditSaleId(null);
          loadData(page, rowsPerPage, searchQuery);
        }}
      />

      <SweetConfirmModal
        visible={!!deleteTarget}
        type={deleteError ? 'error' : 'danger'}
        title="Delete Sale Order"
        subtitle="Are you sure you want to permanently delete this sale order? The deletion will sync immediately with the server."
        entityName={
          deleteTarget
            ? `${deleteTarget.reference || deleteTarget.invoiceNumber || deleteTarget.id} • ${deleteTarget.customerName || 'Customer'} (₹${Number(deleteTarget.total || 0).toFixed(2)})`
            : undefined
        }
        sideEffects={[
          {
            icon: 'stock',
            title: 'Inventory Stock Restoration',
            description: 'Quantities sold in this order will be credited back into product stock.',
          },
          {
            icon: 'wallet',
            title: 'Customer Ledger Balance Adjustment',
            description: 'Any unpaid due recorded on this order will be reversed from the customer account.',
          },
          {
            icon: 'server',
            title: 'Permanent Server Deletion',
            description: 'Order and associated payment transactions will be permanently deleted from the server.',
          },
        ]}
        confirmText="Yes, Delete Order"
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
    width: 30,
    height: 30,
  },
  iconButtonSmall: {
    width: 28,
    height: 28,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 6,
    gap: 8,
  },
  primaryActionBtnMobile: {
    paddingHorizontal: 8,
    height: 30,
    gap: 4,
  },
  primaryActionBtnSmall: {
    paddingHorizontal: 6,
    height: 28,
    gap: 3,
  },
  primaryActionText: { color: 'white', fontWeight: '600', fontSize: 13 },
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
    marginTop: 2,
  },
  cardBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  paymentBadgeText: {
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
  cardDue: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
