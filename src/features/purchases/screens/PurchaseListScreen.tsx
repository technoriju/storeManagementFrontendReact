import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { PurchaseScreenType } from '../PurchasesModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
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

  // Mock data based on the screenshot
  const purchases = [
    { id: '1', supplierName: 'Electro Mart', reference: 'PT001', date: '24 Dec 2024', status: 'Received', total: 1000, paid: 1000, due: 0, paymentStatus: 'Paid' },
    { id: '2', supplierName: 'Quantum Gadgets', reference: 'PT002', date: '10 Dec 2024', status: 'Pending', total: 1500, paid: 0, due: 1500, paymentStatus: 'Unpaid' },
    { id: '3', supplierName: 'Prime Bazaar', reference: 'PT003', date: '27 Nov 2024', status: 'Received', total: 1500, paid: 1800, due: 0, paymentStatus: 'Paid' },
    { id: '4', supplierName: 'Gadget World', reference: 'PT004', date: '18 Nov 2024', status: 'Ordered', total: 2000, paid: 1000, due: 1000, paymentStatus: 'Overdue' },
    { id: '5', supplierName: 'Volt Vault', reference: 'PT005', date: '06 Nov 2024', status: 'Received', total: 800, paid: 800, due: 0, paymentStatus: 'Paid' },
    { id: '6', supplierName: 'Elite Retail', reference: 'PT006', date: '25 Oct 2024', status: 'Pending', total: 750, paid: 0, due: 750, paymentStatus: 'Unpaid' },
    { id: '7', supplierName: 'Prime Mart', reference: 'PT007', date: '14 Oct 2024', status: 'Received', total: 1300, paid: 1300, due: 0, paymentStatus: 'Paid' },
    { id: '8', supplierName: 'NeoTech Store', reference: 'PT008', date: '03 Oct 2024', status: 'Received', total: 1100, paid: 1100, due: 0, paymentStatus: 'Paid' },
    { id: '9', supplierName: 'Urban Mart', reference: 'PT009', date: '20 Sep 2024', status: 'Ordered', total: 2300, paid: 2300, due: 0, paymentStatus: 'Paid' },
  ];

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

  const columns = [
    { 
      key: 'supplierName', 
      title: 'Supplier Name', 
      flex: 1.5,
      minWidth: 150,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
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
      key: 'total', 
      title: 'Total', 
      width: 100,
      render: (value: number) => <Text style={{ color: theme.colors.textSecondary }}>${value?.toFixed(2)}</Text>
    },
    { 
      key: 'paid', 
      title: 'Paid', 
      width: 100,
      render: (value: number) => <Text style={{ color: theme.colors.textSecondary }}>${value?.toFixed(2)}</Text>
    },
    { 
      key: 'due', 
      title: 'Due', 
      width: 100,
      render: (value: number) => <Text style={{ color: theme.colors.textSecondary }}>${value?.toFixed(2)}</Text>
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
      <Pressable 
        style={[styles.primaryActionBtn, { backgroundColor: '#F97316' }]} 
        onPress={() => onNavigate('form')}
      >
        <PlusCircle size={16} color="white" />
        <Text style={styles.primaryActionText}>Add Purchase</Text>
      </Pressable>
      <Pressable 
        style={[styles.primaryActionBtn, { backgroundColor: '#1E3A8A' }]} 
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
      <Pressable style={[styles.rowActionBtn, { borderColor: theme.colors.border }]} onPress={() => onNavigate('form', item.id)}>
        <Edit size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}>
        <Trash2 size={16} color={theme.colors.textSecondary} />
      </Pressable>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AdvancedTable
        title="Purchase"
        subtitle="Manage your purchases"
        headerActions={headerActions}
        columns={columns}
        data={purchases}
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
  },
  rowActionBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  }
});
