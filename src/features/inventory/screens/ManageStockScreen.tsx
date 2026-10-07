import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { useStockList } from '../api/useStock';
import { AddStockModal } from '../components/AddStockModal';
import { AdjustStockModal } from '../components/AdjustStockModal';
import { StockHistoryModal } from '../components/StockHistoryModal';
import { StockItem } from '../../../core/repositories/StockRepository';
import { categoryRepository } from '../../../core/repositories/CategoryRepository';
import { brandRepository } from '../../../core/repositories/BrandRepository';
import {
  FileText,
  FileSpreadsheet,
  RefreshCw,
  PlusCircle,
  SlidersHorizontal,
  History,
  Box,
  Layers,
  AlertTriangle,
  TrendingDown,
  CircleDollarSign,
  Plus,
  Edit2,
  Eye,
} from 'lucide-react-native';

interface Props {
  onNavigate?: (screen: any, id?: any) => void;
}

export const ManageStockScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [selectedBrand, setSelectedBrand] = useState<number | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);

  // Lookups
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);

  // Modals
  const [isAddStockVisible, setIsAddStockVisible] = useState(false);
  const [isAdjustStockVisible, setIsAdjustStockVisible] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [activeProductId, setActiveProductId] = useState<string | number | null>(null);
  const [activeProductName, setActiveProductName] = useState<string>('');

  // Fetch Stocks
  const { data, isLoading, refetch } = useStockList({
    search: searchQuery,
    categoryId: selectedCategory,
    brandId: selectedBrand,
    status: selectedStatus,
  });

  const stockItems = data?.items || [];
  const summary = data?.summary || {
    totalProducts: 0,
    totalStockQuantity: 0,
    totalStockValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inStockCount: 0,
  };

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const catList = await categoryRepository.getAll();
        setCategories(catList.map((c: any) => ({ id: Number(c.id), name: c.name })));
      } catch (_) {}

      try {
        const brList = await brandRepository.getAll();
        setBrands(brList.map((b: any) => ({ id: Number(b.id), name: b.name })));
      } catch (_) {}
    };
    loadLookups();
  }, []);

  const openAddStock = (item?: StockItem) => {
    if (item) {
      setActiveProductId(item.id);
      setActiveProductName(item.name);
    } else {
      setActiveProductId(null);
      setActiveProductName('');
    }
    setIsAddStockVisible(true);
  };

  const openAdjustStock = (item?: StockItem) => {
    if (item) {
      setActiveProductId(item.id);
      setActiveProductName(item.name);
    } else {
      setActiveProductId(null);
      setActiveProductName('');
    }
    setIsAdjustStockVisible(true);
  };

  const openHistory = (item?: StockItem) => {
    if (item) {
      setActiveProductId(item.id);
      setActiveProductName(item.name);
    } else {
      setActiveProductId(null);
      setActiveProductName('');
    }
    setIsHistoryVisible(true);
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    if (status === 'OUT_OF_STOCK') {
      return (
        <View style={[styles.badgeContainer, { backgroundColor: '#FEF2F2' }]}>
          <View style={[styles.badgeDot, { backgroundColor: '#EF4444' }]} />
          <Text style={[styles.badgeText, { color: '#EF4444' }]}>Out of Stock</Text>
        </View>
      );
    }
    if (status === 'LOW_STOCK') {
      return (
        <View style={[styles.badgeContainer, { backgroundColor: '#FFFBEB' }]}>
          <View style={[styles.badgeDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.badgeText, { color: '#D97706' }]}>Low Stock</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badgeContainer, { backgroundColor: '#ECFDF5' }]}>
        <View style={[styles.badgeDot, { backgroundColor: '#10B981' }]} />
        <Text style={[styles.badgeText, { color: '#10B981' }]}>In Stock</Text>
      </View>
    );
  };

  // Columns definition
  const columns = [
    { key: 'sku', title: 'SKU', width: 110 },
    {
      key: 'name',
      title: 'Product Name',
      flex: 2,
      minWidth: 190,
      render: (value: string, item: StockItem) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={[
              styles.productThumb,
              { backgroundColor: theme.colors.background }
            ]}
          >
            <Box size={16} color={theme.colors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontWeight: '600' }} numberOfLines={1}>
              {value || item.name}
            </Text>
            <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
              {item.categoryName || 'General'}
            </Text>
          </View>
        </View>
      ),
    },
    {
      key: 'brandName',
      title: 'Brand',
      flex: 1,
      minWidth: 110,
      render: (value: string) => (
        <Text style={{ color: theme.colors.textSecondary }}>{value || 'None'}</Text>
      ),
    },
    {
      key: 'unit',
      title: 'Unit',
      width: 75,
      render: (value: string) => (
        <Text style={{ color: theme.colors.textSecondary }}>{value || 'pcs'}</Text>
      ),
    },
    {
      key: 'purchasePrice',
      title: 'Cost (₹)',
      width: 100,
      render: (value: number) => (
        <Text style={{ color: theme.colors.textSecondary }}>₹{Number(value || 0).toFixed(2)}</Text>
      ),
    },
    {
      key: 'currentStock',
      title: 'Stock Qty',
      width: 110,
      render: (value: number, item: StockItem) => {
        const qty = Number(value || 0);
        const isOut = qty <= 0;
        const isLow = !isOut && qty <= item.lowStockThreshold;

        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: isOut ? '#EF4444' : isLow ? '#D97706' : theme.colors.text,
              }}
            >
              {qty}
            </Text>
            <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
              {item.unit || 'pcs'}
            </Text>
          </View>
        );
      },
    },
    {
      key: 'stockValue',
      title: 'Stock Value',
      width: 120,
      render: (value: number) => (
        <Text style={{ color: theme.colors.text, fontWeight: '600' }}>
          ₹{Number(value || 0).toFixed(2)}
        </Text>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      width: 130,
      render: (value: string) => renderStatusBadge(value),
    },
  ];

  // Header Actions
  const headerActions = (
    <>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
        <FileText size={16} color="#E11D48" />
      </Pressable>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
        <FileSpreadsheet size={16} color="#10B981" />
      </Pressable>
      <Pressable
        style={[styles.iconButton, { borderColor: theme.colors.border }]}
        onPress={() => refetch()}
      >
        <RefreshCw size={16} color={theme.colors.textSecondary} />
      </Pressable>

      <Pressable
        style={[styles.primaryActionBtn, { backgroundColor: '#F97316' }]}
        onPress={() => openAddStock()}
      >
        <PlusCircle size={16} color="white" />
        <Text style={styles.primaryActionText}>Add Stock</Text>
      </Pressable>

      <Pressable
        style={[styles.primaryActionBtn, { backgroundColor: '#1E3A8A' }]}
        onPress={() => openAdjustStock()}
      >
        <SlidersHorizontal size={15} color="white" />
        <Text style={styles.primaryActionText}>Adjust Stock</Text>
      </Pressable>

      <Pressable
        style={[styles.outlineActionBtn, { borderColor: theme.colors.border }]}
        onPress={() => openHistory()}
      >
        <History size={15} color={theme.colors.text} />
        <Text style={[styles.outlineActionText, { color: theme.colors.text }]}>Stock Log</Text>
      </Pressable>
    </>
  );

  // Filter toolbar chips
  const filters = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxWidth: '100%' }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        {/* Status Pills */}
        <Pressable
          style={[
            styles.filterPill,
            !selectedStatus
              ? { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' }
              : { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }
          ]}
          onPress={() => setSelectedStatus(undefined)}
        >
          <Text style={[styles.filterPillText, !selectedStatus ? { color: '#FFF' } : { color: theme.colors.text }]}>
            All
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.filterPill,
            selectedStatus === 'IN_STOCK'
              ? { backgroundColor: '#10B981', borderColor: '#10B981' }
              : { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }
          ]}
          onPress={() => setSelectedStatus(selectedStatus === 'IN_STOCK' ? undefined : 'IN_STOCK')}
        >
          <Text style={[styles.filterPillText, selectedStatus === 'IN_STOCK' ? { color: '#FFF' } : { color: '#10B981' }]}>
            In Stock ({summary.inStockCount})
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.filterPill,
            selectedStatus === 'LOW_STOCK'
              ? { backgroundColor: '#F59E0B', borderColor: '#F59E0B' }
              : { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }
          ]}
          onPress={() => setSelectedStatus(selectedStatus === 'LOW_STOCK' ? undefined : 'LOW_STOCK')}
        >
          <Text style={[styles.filterPillText, selectedStatus === 'LOW_STOCK' ? { color: '#FFF' } : { color: '#D97706' }]}>
            Low Stock ({summary.lowStockCount})
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.filterPill,
            selectedStatus === 'OUT_OF_STOCK'
              ? { backgroundColor: '#EF4444', borderColor: '#EF4444' }
              : { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }
          ]}
          onPress={() => setSelectedStatus(selectedStatus === 'OUT_OF_STOCK' ? undefined : 'OUT_OF_STOCK')}
        >
          <Text style={[styles.filterPillText, selectedStatus === 'OUT_OF_STOCK' ? { color: '#FFF' } : { color: '#EF4444' }]}>
            Out of Stock ({summary.outOfStockCount})
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  // Row Action buttons
  const renderRowActions = (item: StockItem) => (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {/* Quick Add Stock */}
      <Pressable
        style={[styles.rowActionBtn, { borderColor: '#FED7AA', backgroundColor: '#FFF7ED' }]}
        onPress={() => openAddStock(item)}
      >
        <Plus size={15} color="#F97316" />
      </Pressable>

      {/* Quick Adjust */}
      <Pressable
        style={[styles.rowActionBtn, { borderColor: '#DBEAFE', backgroundColor: '#EFF6FF' }]}
        onPress={() => openAdjustStock(item)}
      >
        <Edit2 size={14} color="#1E3A8A" />
      </Pressable>

      {/* View Log */}
      <Pressable
        style={[styles.rowActionBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
        onPress={() => openHistory(item)}
      >
        <History size={14} color={theme.colors.textSecondary} />
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* KPI Counters Bar */}
      <View style={styles.kpiGrid}>
        {/* Total Products */}
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#EFF6FF' }]}>
            <Box size={20} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.kpiLabel}>Total Products</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
              {summary.totalProducts}
            </Text>
          </View>
        </View>

        {/* Total Stock Units */}
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#ECFDF5' }]}>
            <Layers size={20} color="#10B981" />
          </View>
          <View>
            <Text style={styles.kpiLabel}>Stock in Hand</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
              {summary.totalStockQuantity}
            </Text>
          </View>
        </View>

        {/* Low Stock Alert */}
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#FFFBEB' }]}>
            <TrendingDown size={20} color="#D97706" />
          </View>
          <View>
            <Text style={styles.kpiLabel}>Low Stock Items</Text>
            <Text style={[styles.kpiValue, { color: '#D97706' }]}>
              {summary.lowStockCount}
            </Text>
          </View>
        </View>

        {/* Out of Stock Alert */}
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#FEF2F2' }]}>
            <AlertTriangle size={20} color="#EF4444" />
          </View>
          <View>
            <Text style={styles.kpiLabel}>Out of Stock</Text>
            <Text style={[styles.kpiValue, { color: '#EF4444' }]}>
              {summary.outOfStockCount}
            </Text>
          </View>
        </View>

        {/* Total Valuation */}
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#F5F3FF' }]}>
            <CircleDollarSign size={20} color="#7C3AED" />
          </View>
          <View>
            <Text style={styles.kpiLabel}>Inventory Valuation</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>
              ₹{Number(summary.totalStockValue || 0).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Stock Table */}
      <View style={{ flex: 1 }}>
        <AdvancedTable
          title="Manage Stock"
          subtitle="Real-time stock balance, inward receipts, and adjustments"
          headerActions={headerActions}
          columns={columns}
          data={stockItems}
          onSearch={setSearchQuery}
          filters={filters}
          renderRowActions={renderRowActions}
          isLoading={isLoading}
        />
      </View>

      {/* Modals */}
      <AddStockModal
        visible={isAddStockVisible}
        onClose={() => setIsAddStockVisible(false)}
        preselectedProductId={activeProductId}
        onSuccess={() => refetch()}
      />

      <AdjustStockModal
        visible={isAdjustStockVisible}
        onClose={() => setIsAdjustStockVisible(false)}
        preselectedProductId={activeProductId}
        onSuccess={() => refetch()}
      />

      <StockHistoryModal
        visible={isHistoryVisible}
        onClose={() => setIsHistoryVisible(false)}
        productId={activeProductId}
        productName={activeProductName}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 14,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  kpiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
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
    fontWeight: '600',
    fontSize: 13,
  },
  outlineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'white',
    gap: 6,
  },
  outlineActionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  productThumb: {
    width: 32,
    height: 32,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    alignSelf: 'flex-start',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rowActionBtn: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
