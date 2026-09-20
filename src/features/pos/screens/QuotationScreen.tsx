import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, Image } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { PosScreenType } from '../POSModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { 
  ChevronDown,
  Eye,
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

export const QuotationScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const quotations = [
    { id: '1', productName: 'Lenovo 3rd Generation', productImg: 'https://via.placeholder.com/24', customerName: 'Carl Evans', avatar: 'https://i.pravatar.cc/150?u=1', status: 'Sent', total: 550 },
    { id: '2', productName: 'Bold V3.2', productImg: 'https://via.placeholder.com/24', customerName: 'Minerva Rameriz', avatar: 'https://i.pravatar.cc/150?u=2', status: 'Sent', total: 430 },
    { id: '3', productName: 'Nike Jordan', productImg: 'https://via.placeholder.com/24', customerName: 'Robert Lamon', avatar: 'https://i.pravatar.cc/150?u=3', status: 'Ordered', total: 260 },
    { id: '4', productName: 'Apple Series 5 Watch', productImg: 'https://via.placeholder.com/24', customerName: 'Mark Joslyn', avatar: 'https://i.pravatar.cc/150?u=5', status: 'Sent', total: 470 },
    { id: '5', productName: 'Amazon Echo Dot', productImg: 'https://via.placeholder.com/24', customerName: 'Patricia Lewis', avatar: 'https://i.pravatar.cc/150?u=4', status: 'Pending', total: 380 },
    { id: '6', productName: 'Lobar Handy', productImg: 'https://via.placeholder.com/24', customerName: 'Marsha Betts', avatar: 'https://i.pravatar.cc/150?u=6', status: 'Sent', total: 190 },
    { id: '7', productName: 'Red Premium Handy', productImg: 'https://via.placeholder.com/24', customerName: 'Daniel Jude', avatar: 'https://i.pravatar.cc/150?u=7', status: 'Pending', total: 540 },
    { id: '8', productName: 'Iphone 14 Pro', productImg: 'https://via.placeholder.com/24', customerName: 'Emma Bates', avatar: 'https://i.pravatar.cc/150?u=8', status: 'Ordered', total: 610 },
    { id: '9', productName: 'Black Slim 200', productImg: 'https://via.placeholder.com/24', customerName: 'Richard Fralick', avatar: 'https://i.pravatar.cc/150?u=9', status: 'Pending', total: 220 },
    { id: '10', productName: 'Woodcraft Sandal', productImg: 'https://via.placeholder.com/24', customerName: 'Michelle Robison', avatar: 'https://i.pravatar.cc/150?u=10', status: 'Sent', total: 460 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Sent': return { bg: '#10B981', text: 'white' };
      case 'Ordered': return { bg: '#F59E0B', text: 'white' };
      case 'Pending': return { bg: '#0EA5E9', text: 'white' };
      default: return { bg: theme.colors.border, text: theme.colors.text };
    }
  };

  const columns = [
    { 
      key: 'product', 
      title: 'Product Name', 
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
      key: 'customer', 
      title: 'Custmer Name', 
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
    }
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
        <Text style={styles.primaryActionText}>Add Quotation</Text>
      </Pressable>
    </>
  );

  const filters = (
    <>
      <View style={[styles.filterDropdown, { borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.text }}>Product</Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
      </View>
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
        title="Quotation List"
        subtitle="Manage Your Quotation"
        headerActions={headerActions}
        columns={columns}
        data={quotations}
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
