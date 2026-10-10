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
  ChevronDown 
} from 'lucide-react-native';

interface Props {
  onNavigate: (screen: PurchaseScreenType, id?: string) => void;
}

export const PurchaseListScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
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

  const headerActions = (
    <>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]} onPress={() => loadData(page, rowsPerPage, searchQuery)}>
        <RefreshCw size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable 
        style={[styles.primaryActionBtn, { backgroundColor: '#F97316' }]} 
        onPress={() => setShowAddModal(true)}
      >
        <PlusCircle size={16} color="white" />
        <Text style={styles.primaryActionText}>Add Purchase</Text>
      </Pressable>
      <Pressable 
        style={[styles.primaryActionBtn, { backgroundColor: '#1E3A8A' }]} 
        onPress={() => setShowImportModal(true)}
      >
        <Download size={16} color="white" />
        <Text style={styles.primaryActionText}>Import Purchase</Text>
      </Pressable>
    </>
  );

  const filters = (
    <>
      <View style={[styles.filterDropdown, { borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.text }}>Payment Status</Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
      </View>
    </>
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

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setPage(1);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AdvancedTable
        title="Purchase"
        subtitle="Manage your purchases and supplier invoices"
        headerActions={headerActions}
        columns={columns}
        data={tablePurchases}
        searchValue={searchQuery}
        onSearch={handleSearch}
        debounceSearchMs={400}
        filters={filters}
        renderRowActions={renderRowActions}
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
  iconButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  primaryActionText: { color: 'white', fontSize: 13, fontWeight: '600' },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'white',
  },
  rowActionBtn: {
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 6,
    backgroundColor: 'white',
  },
});
