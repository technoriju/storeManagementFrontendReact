import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, Image } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { PosScreenType } from '../POSModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { 
  ChevronDown,
  Eye,
  Trash2
} from 'lucide-react-native';

interface Props {
  onNavigate: (screen: PosScreenType, id?: string) => void;
}

export const InvoicesScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const invoices = [
    { id: '1', invoiceNo: 'INV001', customerName: 'Carl Evans', avatar: 'https://i.pravatar.cc/150?u=1', dueDate: '24 Dec 2024', amount: 1000, paid: 1000, amountDue: 0, status: 'Paid' },
    { id: '2', invoiceNo: 'INV002', customerName: 'Minerva Rameriz', avatar: 'https://i.pravatar.cc/150?u=2', dueDate: '24 Dec 2024', amount: 1500, paid: 0, amountDue: 1500, status: 'Unpaid' },
    { id: '3', invoiceNo: 'INV003', customerName: 'Robert Lamon', avatar: 'https://i.pravatar.cc/150?u=3', dueDate: '24 Dec 2024', amount: 1500, paid: 0, amountDue: 1500, status: 'Unpaid' },
    { id: '4', invoiceNo: 'INV004', customerName: 'Patricia Lewis', avatar: 'https://i.pravatar.cc/150?u=4', dueDate: '24 Dec 2024', amount: 2000, paid: 1000, amountDue: 1000, status: 'Overdue' },
    { id: '5', invoiceNo: 'INV005', customerName: 'Mark Joslyn', avatar: 'https://i.pravatar.cc/150?u=5', dueDate: '24 Dec 2024', amount: 800, paid: 800, amountDue: 0, status: 'Paid' },
    { id: '6', invoiceNo: 'INV006', customerName: 'Marsha Betts', avatar: 'https://i.pravatar.cc/150?u=6', dueDate: '24 Dec 2024', amount: 750, paid: 0, amountDue: 750, status: 'Unpaid' },
    { id: '7', invoiceNo: 'INV007', customerName: 'Daniel Jude', avatar: 'https://i.pravatar.cc/150?u=7', dueDate: '24 Dec 2024', amount: 1300, paid: 1300, amountDue: 0, status: 'Paid' },
    { id: '8', invoiceNo: 'INV008', customerName: 'Emma Bates', avatar: 'https://i.pravatar.cc/150?u=8', dueDate: '24 Dec 2024', amount: 1100, paid: 1100, amountDue: 0, status: 'Paid' },
    { id: '9', invoiceNo: 'INV009', customerName: 'Richard Fralick', avatar: 'https://i.pravatar.cc/150?u=9', dueDate: '24 Dec 2024', amount: 2300, paid: 2300, amountDue: 0, status: 'Paid' },
    { id: '10', invoiceNo: 'INV010', customerName: 'Michelle Robison', avatar: 'https://i.pravatar.cc/150?u=10', dueDate: '24 Dec 2024', amount: 1700, paid: 1700, amountDue: 0, status: 'Paid' },
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Paid': return { bg: '#ECFDF5', text: '#10B981', dot: '#10B981' };
      case 'Unpaid': return { bg: '#FEF2F2', text: '#EF4444', dot: '#EF4444' };
      case 'Overdue': return { bg: '#FFFBEB', text: '#F59E0B', dot: '#F59E0B' };
      default: return { bg: theme.colors.background, text: theme.colors.textSecondary, dot: 'transparent' };
    }
  };

  const columns = [
    { 
      key: 'invoiceNo', 
      title: 'Invoice No', 
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
      key: 'dueDate', 
      title: 'Due Date', 
      flex: 1,
      minWidth: 120,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
    },
    { 
      key: 'amount', 
      title: 'Amount', 
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
      key: 'amountDue', 
      title: 'Amount Due', 
      width: 100,
      render: (value: number) => <Text style={{ color: theme.colors.textSecondary }}>${value?.toFixed(2) || '0.00'}</Text>
    },
    { 
      key: 'status', 
      title: 'Status', 
      width: 130,
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
  ];

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
        <Text style={{ color: theme.colors.text }}>Sort By : Last 7 Days</Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
      </View>
    </>
  );

  const renderRowActions = (item: any) => (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Pressable style={styles.actionIcon}>
        <Eye size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable style={styles.actionIcon}>
        <Trash2 size={16} color={theme.colors.textSecondary} />
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AdvancedTable
        title="Invoices"
        subtitle=""
        columns={columns}
        data={invoices}
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
