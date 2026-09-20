import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable, Image } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useCustomerStore } from '../store/customerStore';
import { CustomerScreenType } from '../CustomersModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { 
  FileText, 
  FileSpreadsheet, 
  RefreshCw, 
  ChevronUp, 
  PlusCircle, 
  Eye,
  Edit,
  Trash2,
  ChevronDown
} from 'lucide-react-native';

interface Props {
  onNavigate: (screen: CustomerScreenType, customerId?: string) => void;
}

export const CustomerListScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const { customers, setCustomers } = useCustomerStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const columns = [
    { 
      key: 'code', 
      title: 'Code', 
      width: 100,
      render: (value: any, item: any) => {
        const code = `CU${String((item.id?.charCodeAt(0) || 0) % 999).padStart(3, '0')}`;
        return <Text style={{ color: theme.colors.textSecondary }}>{code}</Text>;
      }
    },
    { 
      key: 'name', 
      title: 'Customer', 
      flex: 2,
      minWidth: 200,
      render: (value: string, item: any) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={{ width: 32, height: 32, borderRadius: 4, backgroundColor: theme.colors.background }} />
          ) : (
            <View style={{ width: 32, height: 32, borderRadius: 4, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>IMG</Text>
            </View>
          )}
          <Text style={{ color: theme.colors.text, fontWeight: '500' }}>{value}</Text>
        </View>
      )
    },
    { 
      key: 'email', 
      title: 'Email', 
      flex: 1.5,
      minWidth: 150,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value || 'N/A'}</Text>
    },
    { 
      key: 'phone', 
      title: 'Phone', 
      flex: 1,
      minWidth: 120,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value || 'N/A'}</Text>
    },
    { 
      key: 'country', 
      title: 'Country', 
      flex: 1,
      minWidth: 100,
      render: (value: string, item: any) => {
        const country = item.address?.split(',').pop()?.trim() || 'N/A';
        return <Text style={{ color: theme.colors.textSecondary }}>{country}</Text>;
      }
    },
    { 
      key: 'status', 
      title: 'Status', 
      width: 100,
      render: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'white', marginRight: 4 }} />
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>Active</Text>
        </View>
      )
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
      <Pressable 
        style={[styles.primaryActionBtn, { backgroundColor: '#F97316' }]} 
        onPress={() => onNavigate('form')}
      >
        <PlusCircle size={16} color="white" />
        <Text style={styles.primaryActionText}>Add Customer</Text>
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
        title="Customers"
        subtitle="Manage your customers"
        headerActions={headerActions}
        columns={columns}
        data={customers}
        onSearch={setSearchQuery}
        filters={filters}
        renderRowActions={renderRowActions}
        isLoading={isLoading}
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
