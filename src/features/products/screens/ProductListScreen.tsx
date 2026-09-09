import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable, Image } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { useProductStore } from '../store/productStore';
import { ProductScreenType } from '../ProductsModule';
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
  onNavigate: (screen: ProductScreenType, productId?: string) => void;
}

export const ProductListScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const { products, isLoading, error, fetchProducts } = useProductStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const columns = [
    { key: 'sku', title: 'SKU', width: 100 },
    { 
      key: 'name', 
      title: 'Product Name', 
      flex: 2,
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
      key: 'categoryId', 
      title: 'Category', 
      flex: 1,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value || 'N/A'}</Text>
    },
    { 
      key: 'brandId', 
      title: 'Brand', 
      flex: 1,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value || 'N/A'}</Text>
    },
    { 
      key: 'price', 
      title: 'Price', 
      width: 100,
      render: (value: number) => <Text style={{ color: theme.colors.textSecondary }}>${value?.toFixed(2) || '0.00'}</Text>
    },
    { 
      key: 'unitId', 
      title: 'Unit', 
      width: 80,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value || 'Pc'}</Text> // Defaulting to Pc for demo
    },
    { key: 'stockQuantity', title: 'Qty', width: 80 },
    { 
      key: 'createdBy', 
      title: 'Created By', 
      flex: 1.5,
      render: (value: string, item: any) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
              {item.name ? item.name.substring(0, 1).toUpperCase() : 'A'}
            </Text>
          </View>
          <Text style={{ color: theme.colors.textSecondary }}>Admin User</Text>
        </View>
      )
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
        <Text style={styles.primaryActionText}>Add Product</Text>
      </Pressable>
      <Pressable 
        style={[styles.primaryActionBtn, { backgroundColor: '#1E3A8A' }]} 
        onPress={() => onNavigate('import')}
      >
        <Download size={16} color="white" />
        <Text style={styles.primaryActionText}>Import Product</Text>
      </Pressable>
    </>
  );

  const filters = (
    <>
      <View style={[styles.filterDropdown, { borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.text }}>Category</Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
      </View>
      <View style={[styles.filterDropdown, { borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.text }}>Brand</Text>
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
        title="Product List"
        subtitle="Manage your products"
        headerActions={headerActions}
        columns={columns}
        data={products}
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
