import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, Image } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { PurchaseScreenType } from '../PurchasesModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { 
  FileText, 
  FileSpreadsheet, 
  RefreshCw, 
  ChevronUp, 
  ChevronDown
} from 'lucide-react-native';

interface Props {
  onNavigate: (screen: PurchaseScreenType, id?: string) => void;
}

export const PurchaseOrderScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data based on the screenshot
  const orders = [
    { id: '1', product: 'Lenovo IdeaPad 3', img: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&q=80&w=100', amount: 1000, purchasedQty: 40, inStockQty: 30 },
    { id: '2', product: 'Beats Pro', img: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80&w=100', amount: 1500, purchasedQty: 25, inStockQty: 18 },
    { id: '3', product: 'Nike Jordan', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=100', amount: 1500, purchasedQty: 30, inStockQty: 35 },
    { id: '4', product: 'Apple Series 5 Watch', img: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=100', amount: 2000, purchasedQty: 28, inStockQty: 30 },
    { id: '5', product: 'Amazon Echo Dot', img: 'https://images.unsplash.com/photo-1543512214-318c7553f230?auto=format&fit=crop&q=80&w=100', amount: 800, purchasedQty: 15, inStockQty: 10 },
    { id: '6', product: 'Sanford Chair Sofa', img: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=100', amount: 750, purchasedQty: 20, inStockQty: 15 },
    { id: '7', product: 'Red Premium Satchel', img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=100', amount: 1300, purchasedQty: 35, inStockQty: 40 },
    { id: '8', product: 'Iphone 14 Pro', img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=100', amount: 1100, purchasedQty: 45, inStockQty: 35 },
    { id: '9', product: 'Gaming Chair', img: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&q=80&w=100', amount: 2300, purchasedQty: 22, inStockQty: 20 },
  ];

  const columns = [
    { 
      key: 'product', 
      title: 'Product', 
      flex: 2,
      minWidth: 200,
      render: (value: string, item: any) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {item.img ? (
            <Image source={{ uri: item.img }} style={{ width: 32, height: 32, borderRadius: 4, backgroundColor: theme.colors.background }} />
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
      key: 'amount', 
      title: 'Purchased Amount', 
      flex: 1,
      minWidth: 150,
      render: (value: number) => <Text style={{ color: theme.colors.textSecondary }}>${value?.toFixed(2)}</Text>
    },
    { 
      key: 'purchasedQty', 
      title: 'Purchased QTY', 
      flex: 1,
      minWidth: 150,
      render: (value: number) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
    },
    { 
      key: 'inStockQty', 
      title: 'Instock QTY', 
      flex: 1,
      minWidth: 150,
      render: (value: number) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
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
    </>
  );

  const filters = (
    <>
      <View style={[styles.filterDropdown, { borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.text }}>Sort By : Last 7 Days</Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AdvancedTable
        title="Purchase order"
        subtitle="Manage your Purchase order"
        headerActions={headerActions}
        columns={columns}
        data={orders}
        onSearch={setSearchQuery}
        filters={filters}
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
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: 'white',
  },
});
