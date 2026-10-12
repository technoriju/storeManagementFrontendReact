import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { PurchaseScreenType } from '../PurchasesModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { useSyncStore } from '../../../core/sync/useSyncStore';
import { AddPurchaseModal } from '../components/AddPurchaseModal';
import { ImportPurchaseModal } from '../components/ImportPurchaseModal';
import { useDeletePurchase, fetchPaginatedPurchases } from '../api/usePurchases';
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
  X 
} from 'lucide-react-native';

interface Props {
  onNavigate: (screen: PurchaseScreenType, id?: string) => void;
}

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

  const deletePurchaseMutation = useDeletePurchase();
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

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
          supplierName: p.supplierName || (p as any).supplier?.name || 'Unknown Supplier',
          reference: p.reference || p.invoiceNumber || `PO-${p.id}`,
          date: p.date || (p as any).purchaseDate?.split('T')[0] || p.createdAt?.split('T')[0] || '',
          status: p.status || 'Received',
          total: Number((p as any).grandTotal ?? p.total ?? 0),
          paid: Number(p.paid || 0),
          due: Number(p.due || 0),
          paymentStatus: p.paymentStatus || 'Unpaid',
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
    <>
      <Pressable style={[styles.rowActionBtn, { borderColor: theme.colors.border }]} onPress={() => onNavigate('details', item.id)}>
        <Eye size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable
        style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}
        onPress={() => {
          setEditPurchaseId(item.id);
          setShowAddModal(true);
        }}
      >
        <Edit size={16} color="#F59E0B" />
      </Pressable>
      <Pressable style={[styles.rowActionBtn, { borderColor: theme.colors.border }]} onPress={() => handleDelete(item)}>
        <Trash2 size={16} color="#EF4444" />
      </Pressable>
    </>
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
            <Pressable style={[styles.rowActionBtn, { borderColor: theme.colors.border }]} onPress={() => onNavigate('details', item.id)}>
              <Eye size={15} color={theme.colors.textSecondary} />
            </Pressable>
            <Pressable
              style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}
              onPress={() => {
                setEditPurchaseId(item.id);
                setShowAddModal(true);
              }}
            >
              <Edit size={15} color="#F59E0B" />
            </Pressable>
            <Pressable style={[styles.rowActionBtn, { borderColor: theme.colors.border }]} onPress={() => handleDelete(item)}>
              <Trash2 size={15} color="#EF4444" />
            </Pressable>
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
