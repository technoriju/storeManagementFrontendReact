import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, Image } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { PosScreenType } from '../POSModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { 
  ChevronDown,
  Edit,
  Trash2,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  ChevronUp,
  PlusCircle
} from 'lucide-react-native';

interface Props {
  onNavigate: (screen: PosScreenType, id?: string) => void;
}

export const SalesReturnScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const salesReturns = [
    { id: '1', productName: 'Lenovo IdeaPad 3', productImg: 'https://via.placeholder.com/24', date: '19 Nov 2022', customerName: 'Carl Evans', avatar: 'https://i.pravatar.cc/150?u=1', status: 'Received', total: 1000, paid: 1000, due: 0, paymentStatus: 'Paid' },
    { id: '2', productName: 'Apple tablet', productImg: 'https://via.placeholder.com/24', date: '19 Nov 2022', customerName: 'Minerva Rameriz', avatar: 'https://i.pravatar.cc/150?u=2', status: 'Pending', total: 1500, paid: 0, due: 1500, paymentStatus: 'Unpaid' },
    { id: '3', productName: 'Headphone', productImg: 'https://via.placeholder.com/24', date: '19 Nov 2022', customerName: 'Robert Lamon', avatar: 'https://i.pravatar.cc/150?u=3', status: 'Received', total: 2000, paid: 1000, due: 1000, paymentStatus: 'Overdue' },
    { id: '4', productName: 'Nike Jordan', productImg: 'https://via.placeholder.com/24', date: '19 Nov 2022', customerName: 'Mark Joslyn', avatar: 'https://i.pravatar.cc/150?u=5', status: 'Received', total: 1500, paid: 1500, due: 0, paymentStatus: 'Paid' },
    { id: '5', productName: 'Macbook Pro', productImg: 'https://via.placeholder.com/24', date: '19 Nov 2022', customerName: 'Patricia Lewis', avatar: 'https://i.pravatar.cc/150?u=4', status: 'Received', total: 800, paid: 800, due: 0, paymentStatus: 'Paid' },
    { id: '6', productName: 'Red Premium Satchel', productImg: 'https://via.placeholder.com/24', date: '19 Nov 2022', customerName: 'Marsha Betts', avatar: 'https://i.pravatar.cc/150?u=6', status: 'Pending', total: 750, paid: 0, due: 750, paymentStatus: 'Unpaid' },
    { id: '7', productName: 'Apple Earpods', productImg: 'https://via.placeholder.com/24', date: '19 Nov 2022', customerName: 'Daniel Jude', avatar: 'https://i.pravatar.cc/150?u=7', status: 'Received', total: 1300, paid: 1300, due: 0, paymentStatus: 'Paid' },
    { id: '8', productName: 'Iphone 14 Pro', productImg: 'https://via.placeholder.com/24', date: '19 Nov 2022', customerName: 'Emma Bates', avatar: 'https://i.pravatar.cc/150?u=8', status: 'Received', total: 1100, paid: 1100, due: 0, paymentStatus: 'Paid' },
    { id: '9', productName: 'Gaming Chair', productImg: 'https://via.placeholder.com/24', date: '19 Nov 2022', customerName: 'Richard Fralick', avatar: 'https://i.pravatar.cc/150?u=9', status: 'Pending', total: 2300, paid: 2300, due: 0, paymentStatus: 'Paid' },
    { id: '10', productName: 'Borealis Backpack', productImg: 'https://via.placeholder.com/24', date: '19 Nov 2022', customerName: 'Michelle Robison', avatar: 'https://i.pravatar.cc/150?u=10', status: 'Pending', total: 1700, paid: 1700, due: 0, paymentStatus: 'Paid' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Received': return { bg: '#10B981', text: 'white' };
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
      key: 'product', 
      title: 'Product', 
      flex: 1.5,
      minWidth: 150,
      render: (_: any, item: any) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={{ uri: item.productImg }} style={{ width: 24, height: 24, borderRadius: 4 }} />
          <Text style={{ color: theme.colors.textSecondary }}>{item.productName}</Text>
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
      key: 'total', 
      title: 'Total', 
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
      <Pressable style={[styles.primaryActionBtn, { backgroundColor: '#F97316' }]}>
        <PlusCircle size={16} color="white" />
        <Text style={styles.primaryActionText}>Add Sales Return</Text>
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
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Pressable style={styles.actionIcon}>
        <Edit size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable style={styles.actionIcon}>
        <Trash2 size={16} color={theme.colors.textSecondary} />
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AdvancedTable
        title="Sales Return"
        subtitle="Manage your returns"
        headerActions={headerActions}
        columns={columns}
        data={salesReturns}
        onSearch={setSearchQuery}
        filters={filters}
        renderRowActions={renderRowActions}
        isLoading={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
  actionIcon: {
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
  }
});


