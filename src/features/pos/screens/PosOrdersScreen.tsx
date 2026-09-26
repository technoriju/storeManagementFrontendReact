import React, { useState, useRef } from 'react';
import { View, StyleSheet, Text, Pressable, Image, Modal } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { PosScreenType } from '../PosModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { AddSalesModal } from '../components/AddSalesModal';
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
  DollarSign,
  Download,
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

const ActionMenu = ({ item, theme }: { item: any, theme: any }) => {
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
            left: layout.x - 180 + layout.width,
            backgroundColor: theme.colors.surface || 'white',
            borderColor: theme.colors.border,
          }]}>
            <MenuItem icon={<Eye size={16} color="#1E293B" />} label="Sale Detail" onPress={() => setVisible(false)} />
            <MenuItem icon={<Edit size={16} color="#1E293B" />} label="Edit Sale" onPress={() => setVisible(false)} />
            <MenuItem icon={<DollarSign size={16} color="#1E293B" />} label="Show Payments" onPress={() => setVisible(false)} />
            <MenuItem icon={<PlusCircle size={16} color="#1E293B" />} label="Create Payment" onPress={() => setVisible(false)} />
            <MenuItem icon={<Download size={16} color="#1E293B" />} label="Download pdf" onPress={() => setVisible(false)} />
            <MenuItem icon={<Trash2 size={16} color="#1E293B" />} label="Delete Sale" onPress={() => setVisible(false)} />
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

  // Mock data based on the screenshot
  const posOrders = [
    { id: '1', customerName: 'Carl Evans', avatar: 'https://i.pravatar.cc/150?u=1', reference: 'SL001', date: '24 Dec 2024', status: 'Completed', grandTotal: 1000, paid: 1000, due: 0, paymentStatus: 'Paid', biller: 'Admin' },
    { id: '2', customerName: 'Minerva Rameriz', avatar: 'https://i.pravatar.cc/150?u=2', reference: 'SL002', date: '10 Dec 2024', status: 'Pending', grandTotal: 1500, paid: 0, due: 1500, paymentStatus: 'Unpaid', biller: 'Admin' },
    { id: '3', customerName: 'Robert Lamon', avatar: 'https://i.pravatar.cc/150?u=3', reference: 'SL003', date: '08 Feb 2023', status: 'Completed', grandTotal: 1500, paid: 0, due: 1500, paymentStatus: 'Paid', biller: 'Admin' },
    { id: '4', customerName: 'Patricia Lewis', avatar: 'https://i.pravatar.cc/150?u=4', reference: 'SL004', date: '12 Feb 2023', status: 'Completed', grandTotal: 2000, paid: 1000, due: 1000, paymentStatus: 'Overdue', biller: 'Admin' },
    { id: '5', customerName: 'Mark Joslyn', avatar: 'https://i.pravatar.cc/150?u=5', reference: 'SL005', date: '17 Mar 2023', status: 'Completed', grandTotal: 800, paid: 800, due: 0, paymentStatus: 'Paid', biller: 'Admin' },
    { id: '6', customerName: 'Marsha Betts', avatar: 'https://i.pravatar.cc/150?u=6', reference: 'SL006', date: '24 Mar 2023', status: 'Pending', grandTotal: 750, paid: 0, due: 750, paymentStatus: 'Unpaid', biller: 'Admin' },
    { id: '7', customerName: 'Daniel Jude', avatar: 'https://i.pravatar.cc/150?u=7', reference: 'SL007', date: '06 Apr 2023', status: 'Completed', grandTotal: 1300, paid: 1300, due: 0, paymentStatus: 'Paid', biller: 'Admin' },
    { id: '8', customerName: 'Emma Bates', avatar: 'https://i.pravatar.cc/150?u=8', reference: 'SL008', date: '16 Apr 2023', status: 'Completed', grandTotal: 1100, paid: 1100, due: 0, paymentStatus: 'Paid', biller: 'Admin' },
    { id: '9', customerName: 'Richard Fralick', avatar: 'https://i.pravatar.cc/150?u=9', reference: 'SL009', date: '04 May 2023', status: 'Pending', grandTotal: 2300, paid: 2300, due: 0, paymentStatus: 'Paid', biller: 'Admin' },
  ];

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
      title: 'Customer', 
      flex: 1.5,
      minWidth: 150,
      render: (_: any, item: any) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={{ uri: item.avatar }} style={{ width: 24, height: 24, borderRadius: 12 }} />
          <Text style={{ color: theme.colors.textSecondary }}>{item.customerName}</Text>
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
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '500' }}>{value}</Text>
          </View>
        );
      }
    },
    { 
      key: 'grandTotal', 
      title: 'Grand Total', 
      width: 100,
      render: (value: number) => <Text style={{ color: theme.colors.textSecondary }}>${value?.toFixed(2) || '0.00'}</Text>
    },
    { 
      key: 'paid', 
      title: 'Paid', 
      width: 100,
      render: (value: number) => <Text style={{ color: theme.colors.textSecondary }}>${value?.toFixed(2) || '0.00'}</Text>
    },
    { 
      key: 'due', 
      title: 'Due', 
      width: 100,
      render: (value: number) => <Text style={{ color: theme.colors.textSecondary }}>${value?.toFixed(2) || '0.00'}</Text>
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
            <Text style={{ color: style.text, fontSize: 12, fontWeight: '500' }}>{value}</Text>
          </View>
        );
      }
    },
    { 
      key: 'biller', 
      title: 'Biller', 
      flex: 1,
      minWidth: 80,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
    },
  ];

  const headerActions = (
    <>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
        <FileText size={16} color="#E11D48" />
      </Pressable>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
        <FileSpreadsheet size={16} color="#10B981" />
      </Pressable>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
        <RefreshCw size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
        <ChevronUp size={16} color={theme.colors.textSecondary} />
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
        <Text style={{ color: theme.colors.text }}>Customer</Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
      </View>
      <View style={[styles.filterDropdown, { borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.text }}>Status</Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
      </View>
      <View style={[styles.filterDropdown, { borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.text }}>Payment Status</Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
      </View>
      <View style={[styles.filterDropdown, { borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.text }}>Sort By : Last 7 Days</Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
      </View>
    </>
  );

  const renderRowActions = (item: any) => (
    <ActionMenu item={item} theme={theme} />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AdvancedTable
        title="POS Orders"
        subtitle="Manage Your pos orders"
        headerActions={headerActions}
        columns={columns}
        data={posOrders}
        onSearch={setSearchQuery}
        filters={filters}
        renderRowActions={renderRowActions}
        isLoading={false}
      />
      <AddSalesModal visible={showAddModal} onClose={() => setShowAddModal(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  popover: {
    position: 'absolute',
    width: 190,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '400',
  },
  container: { flex: 1, padding: 16 },
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
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 6,
    gap: 8,
  },
  primaryActionText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: 'white',
    marginRight: 8,
  },
});


