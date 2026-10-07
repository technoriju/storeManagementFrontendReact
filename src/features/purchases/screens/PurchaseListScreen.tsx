import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, Alert } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { PurchaseScreenType } from '../PurchasesModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { useSyncStore } from '../../../core/sync/useSyncStore';
import { AddPurchaseModal } from '../components/AddPurchaseModal';
import { ImportPurchaseModal } from '../components/ImportPurchaseModal';
import { usePurchases, useDeletePurchase } from '../api/usePurchases';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editPurchaseId, setEditPurchaseId] = useState<number | string | null>(null);
  const [dismissedPurchaseIds, setDismissedPurchaseIds] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);

  const { data: dbPurchases = [], isLoading, refetch } = usePurchases();
  const deletePurchaseMutation = useDeletePurchase();
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  useEffect(() => {
    refetch();
  }, [lastSyncedAt, refetch]);

  // Initial seed demo purchases shown if database is fresh
  const fallbackPurchases = useMemo(() => [
    { id: '1', supplierName: 'Electro Mart', reference: 'PT001', date: '2024-12-24', status: 'Received', total: 1000, paid: 1000, due: 0, paymentStatus: 'Paid', syncStatus: 'synced' },
    { id: '2', supplierName: 'Quantum Gadgets', reference: 'PT002', date: '2024-12-10', status: 'Pending', total: 1500, paid: 0, due: 1500, paymentStatus: 'Unpaid', syncStatus: 'synced' },
    { id: '3', supplierName: 'Prime Bazaar', reference: 'PT003', date: '2024-11-27', status: 'Received', total: 1500, paid: 1800, due: 0, paymentStatus: 'Paid', syncStatus: 'synced' },
    { id: '4', supplierName: 'Gadget World', reference: 'PT004', date: '2024-11-18', status: 'Ordered', total: 2000, paid: 1000, due: 1000, paymentStatus: 'Overdue', syncStatus: 'synced' },
    { id: '5', supplierName: 'Volt Vault', reference: 'PT005', date: '2024-11-06', status: 'Received', total: 800, paid: 800, due: 0, paymentStatus: 'Paid', syncStatus: 'synced' },
  ], []);

  // Display DB purchases if any exist, otherwise fallback
  const allPurchases = useMemo(() => {
    if (dbPurchases && dbPurchases.length > 0) {
      return dbPurchases
        .filter((p) => !dismissedPurchaseIds.includes(String(p.id)))
        .map((p) => ({
          id: String(p.id),
          supplierName: p.supplierName || 'Unknown Supplier',
          reference: p.reference || p.invoiceNumber || `PO-${p.id}`,
          date: p.date || p.createdAt?.split('T')[0] || '',
          status: p.status || 'Received',
          total: Number(p.total || 0),
          paid: Number(p.paid || 0),
          due: Number(p.due || 0),
          paymentStatus: p.paymentStatus || 'Unpaid',
          syncStatus: p.syncStatus || 'synced',
        }));
    }
    return fallbackPurchases.filter((p) => !dismissedPurchaseIds.includes(String(p.id)));
  }, [dbPurchases, fallbackPurchases, dismissedPurchaseIds]);

  // Filtered by search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return allPurchases;
    const q = searchQuery.toLowerCase().trim();
    return allPurchases.filter((item) =>
      item.supplierName?.toLowerCase().includes(q) ||
      item.reference?.toLowerCase().includes(q) ||
      item.status?.toLowerCase().includes(q) ||
      item.paymentStatus?.toLowerCase().includes(q)
    );
  }, [allPurchases, searchQuery]);

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
    Alert.alert(
      'Delete Purchase',
      `Are you sure you want to delete purchase ${item.reference}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDismissedPurchaseIds((prev) => [...prev, String(item.id)]);
            const numericId = parseInt(item.id, 10);
            const isDbPurchase = dbPurchases.some((p) => String(p.id) === String(item.id));
            if (!isNaN(numericId) && (isDbPurchase || dbPurchases.length > 0)) {
              try {
                await deletePurchaseMutation.mutateAsync(numericId);
              } catch (err: any) {
                console.warn('Failed to delete purchase from db:', err);
              }
            }
          },
        },
      ]
    );
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
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]} onPress={() => refetch()}>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AdvancedTable
        title="Purchase"
        subtitle="Manage your purchases and supplier invoices"
        headerActions={headerActions}
        columns={columns}
        data={filteredData}
        onSearch={setSearchQuery}
        filters={filters}
        renderRowActions={renderRowActions}
        isLoading={isLoading}
      />
      <AddPurchaseModal
        visible={showAddModal}
        editPurchaseId={editPurchaseId}
        onClose={() => {
          setShowAddModal(false);
          setEditPurchaseId(null);
          refetch();
        }}
      />
      <ImportPurchaseModal visible={showImportModal} onClose={() => setShowImportModal(false)} />
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
