import React, { useState, useRef, useMemo } from 'react';
import { View, StyleSheet, Text, Pressable, Image, Modal, Alert } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { PosScreenType } from '../PosModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { AddSalesModal } from '../components/AddSalesModal';
import { useSales, useDeleteSale } from '../api/useSales';
import { 
  FileText, 
  FileSpreadsheet, 
  RefreshCw, 
  ChevronUp, 
  PlusCircle, 
  ChevronDown,
  MoreVertical,
  Eye,
  Trash2
} from 'lucide-react-native';

interface Props {
  onNavigate: (screen: PosScreenType, id?: string) => void;
}

const MenuItem = ({ icon, label, onPress }: any) => (
  <Pressable style={styles.menuItem} onPress={onPress}>
    {icon}
    <Text style={styles.menuItemText}>{label}</Text>
  </Pressable>
);

const ActionMenu = ({ item, theme, onDelete }: { item: any; theme: any; onDelete: (item: any) => void }) => {
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

  const { data: dbSales = [], isLoading, refetch } = useSales();
  const deleteSaleMutation = useDeleteSale();

  // Initial demo orders if DB has no sales yet
  const fallbackOrders = useMemo(() => [
    { id: '1', customerName: 'Carl Evans', avatar: 'https://i.pravatar.cc/150?u=1', reference: 'SL001', date: '2024-12-24', status: 'Completed', grandTotal: 1000, paid: 1000, due: 0, paymentStatus: 'Paid', biller: 'Admin' },
    { id: '2', customerName: 'Minerva Rameriz', avatar: 'https://i.pravatar.cc/150?u=2', reference: 'SL002', date: '2024-12-10', status: 'Pending', grandTotal: 1500, paid: 0, due: 1500, paymentStatus: 'Unpaid', biller: 'Admin' },
    { id: '3', customerName: 'Robert Lamon', avatar: 'https://i.pravatar.cc/150?u=3', reference: 'SL003', date: '2023-02-08', status: 'Completed', grandTotal: 1500, paid: 0, due: 1500, paymentStatus: 'Paid', biller: 'Admin' },
    { id: '4', customerName: 'Patricia Lewis', avatar: 'https://i.pravatar.cc/150?u=4', reference: 'SL004', date: '2023-02-12', status: 'Completed', grandTotal: 2000, paid: 1000, due: 1000, paymentStatus: 'Overdue', biller: 'Admin' },
    { id: '5', customerName: 'Mark Joslyn', avatar: 'https://i.pravatar.cc/150?u=5', reference: 'SL005', date: '2023-03-17', status: 'Completed', grandTotal: 800, paid: 800, due: 0, paymentStatus: 'Paid', biller: 'Admin' },
  ], []);

  const allOrders = useMemo(() => {
    if (dbSales && dbSales.length > 0) {
      return dbSales.map((s) => ({
        id: String(s.id),
        customerName: s.customerName || 'Walk-in Customer',
        avatar: `https://i.pravatar.cc/150?u=${s.id}`,
        reference: s.reference || s.invoiceNumber || `SL-${s.id}`,
        date: s.date || s.createdAt?.split('T')[0] || '',
        status: s.status || 'Completed',
        grandTotal: Number(s.total || 0),
        paid: Number(s.paid || 0),
        due: Number(s.due || 0),
        paymentStatus: s.paymentStatus || 'Unpaid',
        biller: s.biller || 'Admin',
      }));
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
      render: (value: number) => <Text style={{ color: theme.colors.text, fontWeight: '600' }}>${value?.toFixed(2)}</Text>
    },
    { 
      key: 'paid', 
      title: 'Paid', 
      width: 90,
      render: (value: number) => <Text style={{ color: '#10B981' }}>${value?.toFixed(2)}</Text>
    },
    { 
      key: 'due', 
      title: 'Due', 
      width: 90,
      render: (value: number) => <Text style={{ color: value > 0 ? '#EF4444' : theme.colors.textSecondary }}>${value?.toFixed(2)}</Text>
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
    <ActionMenu item={item} theme={theme} onDelete={handleDelete} />
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
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1 },
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
