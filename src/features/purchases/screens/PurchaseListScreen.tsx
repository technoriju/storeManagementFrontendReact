import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Platform, Modal, ScrollView } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { PurchaseScreenType } from '../PurchasesModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { useSyncStore } from '../../../core/sync/useSyncStore';
import { AddPurchaseModal } from '../components/AddPurchaseModal';
import { ImportPurchaseModal } from '../components/ImportPurchaseModal';
import { useDeletePurchase, fetchPaginatedPurchases } from '../api/usePurchases';
import { purchaseRepository } from '../../../core/repositories/PurchaseRepository';
import { supplierRepository } from '../../../core/repositories/SupplierRepository';
import { ReceiptPrintPreviewModal, ReceiptPrintData } from '../../pos/components/ReceiptPrintPreviewModal';
import { SharePurchaseModal } from '../components/SharePurchaseModal';
import { enrichSaleItemsWithProductMeta } from '../../pos/utils/enrichSaleItems';
import { SweetConfirmModal } from '../../../shared/components/feedback/SweetConfirmModal';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
import { 
  FileText, 
  FileSpreadsheet, 
  RefreshCw, 
  ChevronUp, 
  PlusCircle, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  ChevronDown,
  X,
  Printer,
  Share2,
  MoreVertical,
  ExternalLink
} from 'lucide-react-native';

interface Props {
  onNavigate: (screen: PurchaseScreenType, id?: string) => void;
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
              label="View Purchase"
              onPress={() => {
                setVisible(false);
                onView(item);
              }}
            />
            <MenuItem
              icon={<Printer size={16} color="#2563EB" />}
              label="Print Bill"
              onPress={() => {
                setVisible(false);
                onPrint(item);
              }}
            />
            <MenuItem
              icon={<Share2 size={16} color="#10B981" />}
              label="Share Purchase"
              onPress={() => {
                setVisible(false);
                onShare(item);
              }}
            />
            <MenuItem
              icon={<Edit size={16} color="#F59E0B" />}
              label="Edit Purchase"
              onPress={() => {
                setVisible(false);
                onEdit(item);
              }}
            />
            <MenuItem
              icon={<Trash2 size={16} color="#EF4444" />}
              label="Delete Purchase"
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

export const PurchaseListScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('');
  const [tablePurchases, setTablePurchases] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editPurchaseId, setEditPurchaseId] = useState<number | string | null>(null);
  const [dismissedPurchaseIds, setDismissedPurchaseIds] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
  const [printPurchaseData, setPrintPurchaseData] = useState<ReceiptPrintData | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [sharePurchaseData, setSharePurchaseData] = useState<any | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const deletePurchaseMutation = useDeletePurchase();
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  const loadPurchaseItems = async (purchase: any) => {
    if (!purchase) return [];
    let purItems: any[] = [];

    // 1. If server ID, fetch fresh verified items from API
    if (/^\d+$/.test(String(purchase.id)) && Number(purchase.id) > 0 && Number(purchase.id) < 1000000000000) {
      try {
        const serverPurchase = await purchaseRepository.fetchByIdFromApi(Number(purchase.id));
        if (serverPurchase?.items && serverPurchase.items.length > 0) {
          purItems = serverPurchase.items;
        }
      } catch (err) {
        console.warn('Server fetch items fallback to local:', err);
      }
    }

    // 2. Fallback to purchase.items
    if ((!purItems || purItems.length === 0) && purchase.items && purchase.items.length > 0) {
      purItems = purchase.items;
    }

    // 3. Fallback to local DB getItemsForPurchase
    if ((!purItems || purItems.length === 0) && purchase.id) {
      purItems = await purchaseRepository.getItemsForPurchase(Number(purchase.id));
    }

    // 4. Strict filter: must belong to this purchase, quantity > 0, deduplicate
    const itemsMap = new Map<string, any>();
    for (const it of (purItems || [])) {
      if (!it) continue;
      if (it.purchaseId !== undefined && it.purchaseId !== null && purchase.id && Number(it.purchaseId) !== Number(purchase.id)) {
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

  const handleOpenPrintPreview = async (purchase: any) => {
    if (!purchase) return;
    const purItems = await loadPurchaseItems(purchase);

    let supplierDetails: any = null;
    if (purchase.supplierId) {
      try {
        supplierDetails = await supplierRepository.getById(Number(purchase.supplierId));
      } catch (_) {}
    } else if (purchase.supplierName) {
      try {
        const allSupps = await supplierRepository.getAll();
        supplierDetails = allSupps.find((s) => s.name?.toLowerCase().trim() === purchase.supplierName?.toLowerCase().trim());
      } catch (_) {}
    }

    const itemsForPrint = purItems && purItems.length > 0
      ? purItems.map((i: any) => ({
          productId: i.productId,
          productName: i.productName || `Product #${i.productId || 1}`,
          sku: i.sku,
          brand: i.brand || i.brandName || i.product?.brandName,
          brandName: i.brandName || i.brand || i.product?.brandName,
          subUnit: i.subUnit || i.subUnitName || i.product?.subUnitName,
          subUnitName: i.subUnitName || i.subUnit || i.product?.subUnitName,
          conversionRate: i.conversionRate !== undefined ? Number(i.conversionRate) : (i.product?.conversionRate ? Number(i.product.conversionRate) : undefined),
          baseUnitName: i.baseUnitName || i.product?.baseUnitName || i.product?.unitName || i.unit,
          unitType: i.unitType || 'base',
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice || i.unitCost || 0),
          discount: Number(i.discount) || 0,
          gst: Number(i.gst) || 0,
          taxAmount: Number(i.taxAmount) || 0,
          total: Number(i.total) || 0,
          unit: (i.unitType === 'sub' && (i.subUnit || i.subUnitName)) ? (i.subUnit || i.subUnitName) : (i.unit || i.unitName || i.baseUnitName || i.product?.baseUnitName || i.product?.unitName || 'Unit'),
          unitName: (i.unitType === 'sub' && (i.subUnit || i.subUnitName)) ? (i.subUnit || i.subUnitName) : (i.unitName || i.unit || i.baseUnitName || i.product?.baseUnitName || i.product?.unitName || 'Unit'),
          product: i.product,
          productUnit: i.productUnit,
          hsn: i.hsn || '',
        }))
      : [
          {
            productName: 'General Goods / Services',
            quantity: 1,
            unitPrice: Number(purchase.total || purchase.grandTotal || 0),
            discount: 0,
            gst: 0,
            total: Number(purchase.total || purchase.grandTotal || 0),
            unit: 'Unit',
          },
        ];

    const rData: ReceiptPrintData = {
      invoiceNumber: purchase.reference || purchase.invoiceNumber || `PUR-${purchase.id}`,
      reference: purchase.reference,
      date: purchase.date,
      customerName: supplierDetails?.name || purchase.supplierName || 'Supplier',
      customerPhone: supplierDetails?.phone || purchase.supplierPhone || '',
      customerAddress: supplierDetails?.address || purchase.supplierAddress || '',
      customerGstin: supplierDetails?.taxNumber || supplierDetails?.gstin || purchase.supplierGstin || '',
      customerType: 'wholesale',
      biller: purchase.biller || 'Purchase Officer',
      subtotal: Number(purchase.subtotal || purchase.total || 0),
      discount: Number(purchase.discount || 0),
      gst: Number(purchase.gst || purchase.orderTax || 0),
      shipping: Number(purchase.shipping || 0),
      total: Number(purchase.total || purchase.grandTotal || 0),
      paid: Number(purchase.paid !== undefined ? purchase.paid : (purchase.total || 0)),
      due: Number(purchase.due !== undefined ? purchase.due : 0),
      paymentMethod: purchase.paymentMethod || 'Cash',
      previousDue: purchase.previousDue !== undefined ? Number(purchase.previousDue) : (supplierDetails ? Number(supplierDetails.outstandingBalance || 0) : undefined),
      advancePayment: purchase.advancePayment !== undefined ? Number(purchase.advancePayment) : undefined,
      showPreviousBalance: purchase.showPreviousBalance !== undefined ? Boolean(purchase.showPreviousBalance) : (Number(purchase.previousDue || 0) > 0 || Number(purchase.advancePayment || 0) > 0),
      docTitle: 'PURCHASE BILL',
      partyTitle: 'SUPPLIER DETAILS',
      items: itemsForPrint,
    };

    setPrintPurchaseData(rData);
    setShowPrintModal(true);
  };

  const handleOpenShare = async (purchase: any) => {
    if (!purchase) return;
    const purItems = await loadPurchaseItems(purchase);
    let supplierDetails: any = null;
    if (purchase.supplierId) {
      try {
        supplierDetails = await supplierRepository.getById(Number(purchase.supplierId));
      } catch (_) {}
    } else if (purchase.supplierName) {
      try {
        const allSupps = await supplierRepository.getAll();
        supplierDetails = allSupps.find((s) => s.name?.toLowerCase().trim() === purchase.supplierName?.toLowerCase().trim());
      } catch (_) {}
    }

    setSharePurchaseData({
      ...purchase,
      supplierPhone: supplierDetails?.phone || purchase.supplierPhone,
      supplierEmail: supplierDetails?.email || purchase.supplierEmail,
      supplierAddress: supplierDetails?.address || purchase.supplierAddress,
      supplierGstin: supplierDetails?.taxNumber || supplierDetails?.gstin || purchase.supplierGstin,
      items: purItems,
    });
    setShowShareModal(true);
  };

  const handleViewPurchase = async (purchase: any) => {
    if (!purchase) return;
    const purItems = await loadPurchaseItems(purchase);
    setSelectedPurchase({ ...purchase, items: purItems });
  };

  const loadData = useCallback(async (targetPage: number, targetLimit: number, targetSearch: string) => {
    setIsLoadingData(true);
    try {
      const res = await fetchPaginatedPurchases({
        page: targetPage,
        limit: targetLimit,
        search: targetSearch,
      });
      const mapped = res.data
        .filter((p) => !dismissedPurchaseIds.includes(String(p.id)))
        .map((p) => ({
          id: String(p.id),
          supplierId: p.supplierId || (p as any).supplier?.id,
          supplierName: p.supplierName || (p as any).supplier?.name || 'Unknown Supplier',
          supplierPhone: (p as any).supplierPhone || (p as any).supplier?.phone || '',
          supplierEmail: (p as any).supplierEmail || (p as any).supplier?.email || '',
          supplierAddress: (p as any).supplierAddress || (p as any).supplier?.address || '',
          supplierGstin: (p as any).supplierGstin || (p as any).supplier?.taxNumber || (p as any).supplier?.taxId || (p as any).supplier?.gstin || '',
          reference: p.reference || p.invoiceNumber || `PO-${p.id}`,
          invoiceNumber: p.invoiceNumber || p.reference || `PO-${p.id}`,
          date: p.date || (p as any).purchaseDate?.split('T')[0] || p.createdAt?.split('T')[0] || '',
          status: p.status || 'Received',
          subtotal: Number(p.subtotal || 0),
          discount: Number(p.discount || 0),
          gst: Number(p.gst || 0),
          orderTax: Number(p.orderTax || 0),
          shipping: Number(p.shipping || 0),
          total: Number((p as any).grandTotal ?? p.total ?? 0),
          paid: Number(p.paid || 0),
          due: Number(p.due || 0),
          paymentStatus: p.paymentStatus || 'Unpaid',
          paymentMethod: (p as any).paymentMethod || 'Cash',
          items: p.items || [],
          previousDue: p.previousDue !== undefined ? Number(p.previousDue) : 0,
          advancePayment: p.advancePayment !== undefined ? Number(p.advancePayment) : 0,
          showPreviousBalance: p.showPreviousBalance !== undefined ? Boolean(p.showPreviousBalance) : false,
          syncStatus: p.syncStatus || 'synced',
        }));
      setTablePurchases(mapped);
      setTotalItems(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      console.warn('Failed to load paginated purchases:', e);
    } finally {
      setIsLoadingData(false);
    }
  }, [dismissedPurchaseIds]);

  useEffect(() => {
    loadData(page, rowsPerPage, searchQuery);
  }, [loadData, page, rowsPerPage, searchQuery]);

  useEffect(() => {
    if (lastSyncedAt) {
      loadData(page, rowsPerPage, searchQuery);
    }
  }, [loadData, lastSyncedAt, page, rowsPerPage, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Received': return { bg: '#10B981', text: 'white' };
      case 'Pending': return { bg: '#0EA5E9', text: 'white' };
      case 'Ordered': return { bg: '#F59E0B', text: 'white' };
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
      await deletePurchaseMutation.mutateAsync(targetId);
      setDismissedPurchaseIds((prev) => [...prev, String(deleteTarget.id)]);
      setDeleteTarget(null);
      await loadData(page, rowsPerPage, searchQuery);
    } catch (err: any) {
      console.error('Failed to delete purchase:', err);
      setDeleteError(err?.message || 'Server failed to delete purchase');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    { 
      key: 'supplierName', 
      title: 'Supplier Name', 
      flex: 1.5,
      minWidth: 150,
      render: (value: string) => <Text style={{ color: theme.colors.text, fontWeight: '500' }}>{value}</Text>
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
      minWidth: 120,
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
      key: 'total', 
      title: 'Total', 
      width: 100,
      render: (value: number) => <Text style={{ color: theme.colors.text, fontWeight: '600' }}>₹{value?.toFixed(2)}</Text>
    },
    { 
      key: 'paid', 
      title: 'Paid', 
      width: 100,
      render: (value: number) => <Text style={{ color: '#10B981' }}>₹{value?.toFixed(2)}</Text>
    },
    { 
      key: 'due', 
      title: 'Due', 
      width: 100,
      render: (value: number) => <Text style={{ color: value > 0 ? '#EF4444' : theme.colors.textSecondary }}>₹{value?.toFixed(2)}</Text>
    },
    { 
      key: 'paymentStatus', 
      title: 'Payment Status', 
      width: 130,
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
      key: 'syncStatus', 
      title: 'Sync', 
      width: 100,
      render: (value: string | undefined) => <SyncBadge status={value} />
    }
  ];

  const isSmallMobile = isMobile && windowWidth < 380;
  const actionIconSize = isMobile ? (isSmallMobile ? 14 : 15) : 16;
  const addBtnLabel = !isMobile ? 'Add Purchase' : (windowWidth >= 480 ? 'Add Purchase' : 'Add');
  const importBtnLabel = !isMobile ? 'Import Purchase' : (windowWidth >= 480 ? 'Import Purchase' : 'Import');

  const filteredPurchases = useMemo(() => {
    if (!selectedPaymentStatus) return tablePurchases;
    return tablePurchases.filter(
      (p) => p.paymentStatus?.toLowerCase() === selectedPaymentStatus.toLowerCase()
    );
  }, [tablePurchases, selectedPaymentStatus]);

  const paymentStatusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Paid', value: 'Paid' },
    { label: 'Unpaid', value: 'Unpaid' },
    { label: 'Overdue', value: 'Overdue' },
  ];

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
      <Pressable 
        style={[
          styles.primaryActionBtn, 
          { backgroundColor: '#1E3A8A' },
          isMobile && styles.primaryActionBtnMobile,
          isSmallMobile && styles.primaryActionBtnSmall,
        ]} 
        onPress={() => setShowImportModal(true)}
      >
        <Download size={actionIconSize} color="white" />
        <Text style={[
          styles.primaryActionText,
          isMobile && styles.primaryActionTextMobile,
          isSmallMobile && styles.primaryActionTextSmall,
        ]}>{importBtnLabel}</Text>
      </Pressable>
    </View>
  );

  const filters = (
    <View style={[styles.filtersWrapper, isMobile && { width: '100%' }]}>
      <AppSelect
        placeholder="Payment Status"
        value={selectedPaymentStatus}
        options={paymentStatusOptions}
        onSelect={(val) => {
          setSelectedPaymentStatus(val ? String(val) : '');
          setPage(1);
        }}
        clearable
        containerStyle={[
          styles.filterSelect,
          isMobile ? { flex: 1, minWidth: 0 } : { width: 160 }
        ]}
      />
      {!!selectedPaymentStatus && (
        <Pressable
          style={[styles.clearFilterBtn, { borderColor: theme.colors.border }]}
          onPress={() => setSelectedPaymentStatus('')}
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
      onEdit={(purchase) => {
        setEditPurchaseId(purchase.id);
        setShowAddModal(true);
      }}
      onView={handleViewPurchase}
      onPrint={handleOpenPrintPreview}
      onShare={handleOpenShare}
    />
  );

  const renderPurchaseCard = (item: any) => {
    const statusCol = getStatusColor(item.status);
    const payStyle = getPaymentStatusStyle(item.paymentStatus);
    return (
      <View style={[styles.mobileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.supplierName}
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
              {item.reference} • {item.date}
            </Text>
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
            <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>Total</Text>
            <Text style={[styles.cardPrice, { color: theme.colors.text }]}>₹{item.total?.toFixed(2)}</Text>
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
              onEdit={(purchase) => {
                setEditPurchaseId(purchase.id);
                setShowAddModal(true);
              }}
              onView={handleViewPurchase}
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
        title="Purchase"
        subtitle="Manage your purchases and supplier invoices"
        headerActions={headerActions}
        columns={columns}
        data={filteredPurchases}
        searchValue={searchQuery}
        onSearch={handleSearch}
        debounceSearchMs={400}
        filters={filters}
        renderRowActions={renderRowActions}
        renderMobileCard={renderPurchaseCard}
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

      {selectedPurchase && (
        <Modal visible={!!selectedPurchase} transparent animationType="fade">
          <View style={[styles.modalOverlayCenter, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Purchase #{selectedPurchase.reference}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Supplier: {selectedPurchase.supplierName}</Text>
                </View>
                <Pressable onPress={() => setSelectedPurchase(null)}>
                  <X size={20} color={theme.colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={{ padding: 16, maxHeight: 400 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ color: theme.colors.textSecondary }}>Date: {selectedPurchase.date}</Text>
                  <Text style={{ color: theme.colors.textSecondary }}>Status: {selectedPurchase.status}</Text>
                </View>

                {selectedPurchase.items && selectedPurchase.items.length > 0 && (
                  <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '600', marginBottom: 6 }}>Purchased Items:</Text>
                    {selectedPurchase.items.map((i: any, idx: number) => (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                        <Text style={{ color: theme.colors.textSecondary, flex: 2 }}>{i.productName || `Product #${i.productId}`}</Text>
                        <Text style={{ color: theme.colors.textSecondary, flex: 1 }}>{i.quantity}x @ ₹{Number(i.unitPrice || i.unitCost || 0).toFixed(2)}</Text>
                        <Text style={{ color: theme.colors.text, fontWeight: '500' }}>₹{Number(i.total).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10, gap: 4 }}>
                  {Number(selectedPurchase.subtotal || 0) > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.colors.textSecondary }}>Subtotal:</Text>
                      <Text style={{ color: theme.colors.text }}>₹{Number(selectedPurchase.subtotal).toFixed(2)}</Text>
                    </View>
                  )}
                  {Number(selectedPurchase.discount || 0) > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.colors.textSecondary }}>Discount:</Text>
                      <Text style={{ color: '#EF4444' }}>-₹{Number(selectedPurchase.discount).toFixed(2)}</Text>
                    </View>
                  )}
                  {Number(selectedPurchase.gst || 0) > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.colors.textSecondary }}>Taxes & GST:</Text>
                      <Text style={{ color: theme.colors.text }}>₹{Number(selectedPurchase.gst).toFixed(2)}</Text>
                    </View>
                  )}
                  {Number(selectedPurchase.shipping || 0) > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.colors.textSecondary }}>Shipping:</Text>
                      <Text style={{ color: theme.colors.text }}>+₹{Number(selectedPurchase.shipping).toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.textSecondary }}>Grand Total:</Text>
                    <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 16 }}>₹{Number(selectedPurchase.total).toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#10B981', fontWeight: '500' }}>Paid:</Text>
                    <Text style={{ color: '#10B981', fontWeight: '500' }}>₹{Number(selectedPurchase.paid).toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: selectedPurchase.due > 0 ? '#EF4444' : theme.colors.textSecondary, fontWeight: '500' }}>Due:</Text>
                    <Text style={{ color: selectedPurchase.due > 0 ? '#EF4444' : theme.colors.textSecondary, fontWeight: '500' }}>₹{Number(selectedPurchase.due).toFixed(2)}</Text>
                  </View>
                </View>
              </ScrollView>

              {/* Modal Footer with Full Details, Share and Print Actions */}
              <View style={[
                { flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
                isMobile && { alignItems: 'stretch' }
              ]}>
                <Pressable
                  style={[
                    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
                    isMobile && { width: '100%' }
                  ]}
                  onPress={() => {
                    const id = selectedPurchase.id;
                    setSelectedPurchase(null);
                    onNavigate('details', id);
                  }}
                >
                  <ExternalLink size={15} color={theme.colors.textSecondary} />
                  <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Full Details</Text>
                </Pressable>
                <Pressable
                  style={[
                    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#10B981' },
                    isMobile && { width: '100%' }
                  ]}
                  onPress={() => {
                    handleOpenShare(selectedPurchase);
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
                    handleOpenPrintPreview(selectedPurchase);
                  }}
                >
                  <Printer size={16} color="white" />
                  <Text style={{ color: 'white', fontWeight: '600' }}>Print Bill</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      <ReceiptPrintPreviewModal
        visible={showPrintModal}
        data={printPurchaseData}
        onClose={() => {
          setShowPrintModal(false);
          setPrintPurchaseData(null);
        }}
      />

      <SharePurchaseModal
        visible={showShareModal}
        purchase={sharePurchaseData}
        onClose={() => {
          setShowShareModal(false);
          setSharePurchaseData(null);
        }}
        onOpenFullPreview={() => {
          setShowShareModal(false);
          handleOpenPrintPreview(sharePurchaseData);
        }}
      />

      <AddPurchaseModal
        visible={showAddModal}
        editPurchaseId={editPurchaseId}
        onClose={() => {
          setShowAddModal(false);
          setEditPurchaseId(null);
          loadData(page, rowsPerPage, searchQuery);
        }}
      />
      <ImportPurchaseModal visible={showImportModal} onClose={() => setShowImportModal(false)} />

      <SweetConfirmModal
        visible={!!deleteTarget}
        type={deleteError ? 'error' : 'danger'}
        title="Delete Purchase Bill"
        subtitle="Are you sure you want to permanently delete this purchase record? The deletion will sync immediately with the server."
        entityName={
          deleteTarget
            ? `${deleteTarget.reference || deleteTarget.invoiceNumber || deleteTarget.id} • ${deleteTarget.supplierName || 'Supplier'} (₹${Number(deleteTarget.total || 0).toFixed(2)})`
            : undefined
        }
        sideEffects={[
          {
            icon: 'stock',
            title: 'Warehouse Inventory Deduction',
            description: 'Quantities received from this purchase will be subtracted from warehouse stock.',
          },
          {
            icon: 'wallet',
            title: 'Supplier Account Adjustment',
            description: 'Any payable due owed to this supplier on this bill will be reversed.',
          },
          {
            icon: 'server',
            title: 'Permanent Server Deletion',
            description: 'This purchase and associated transaction records will be permanently deleted from the server.',
          },
        ]}
        confirmText="Yes, Delete Purchase"
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
    width: 160,
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
    paddingVertical: 8,
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
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 6,
    backgroundColor: 'white',
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
