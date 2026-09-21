import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, Switch, Image } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useBrandStore } from '../store/brandStore';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { AppDialog } from '../../../shared/components/feedback/AppDialog';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { 
  FileText, 
  FileSpreadsheet, 
  RefreshCw, 
  ChevronUp, 
  PlusCircle, 
  Edit,
  Trash2,
  ChevronDown,
  Plus
} from 'lucide-react-native';

export const BrandListScreen = () => {
  const theme = useTheme();
  const { brands, addBrand } = useBrandStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandStatus, setNewBrandStatus] = useState(true);

  const columns = [
    { 
      key: 'name', 
      title: 'Brand', 
      flex: 2,
      minWidth: 150,
      render: (value: string) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.brandIconPlaceholder}>
            <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>IMG</Text>
          </View>
          <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
        </View>
      )
    },
    { 
      key: 'createdAt', 
      title: 'Created Date', 
      flex: 1.5,
      minWidth: 120,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
    },
    { 
      key: 'status', 
      title: 'Status', 
      width: 100,
      render: (value: string) => (
        <View style={{ 
          backgroundColor: value === 'Active' ? '#10B981' : theme.colors.error, 
          paddingHorizontal: 8, 
          paddingVertical: 4, 
          borderRadius: 4, 
          alignSelf: 'flex-start' 
        }}>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>• {value}</Text>
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
        onPress={() => setIsAddModalVisible(true)}
      >
        <PlusCircle size={16} color="white" />
        <Text style={styles.primaryActionText}>Add Brand</Text>
      </Pressable>
    </>
  );

  const filters = (
    <>
      <View style={[styles.filterDropdown, { borderColor: theme.colors.border, marginRight: 8 }]}>
        <Text style={{ color: theme.colors.text }}>Status</Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
      </View>
      <View style={[styles.filterDropdown, { borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.text }}>Sort By : Latest</Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
      </View>
    </>
  );

  const renderRowActions = (item: any) => (
    <>
      <Pressable style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}>
        <Edit size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}>
        <Trash2 size={16} color={theme.colors.textSecondary} />
      </Pressable>
    </>
  );

  const handleAddBrand = () => {
    if (!newBrandName) return;
    addBrand({
      id: Math.random().toString(),
      name: newBrandName,
      createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: newBrandStatus ? 'Active' : 'Inactive',
    });
    setNewBrandName('');
    setNewBrandStatus(true);
    setIsAddModalVisible(false);
  };

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AdvancedTable
        title="Brand"
        subtitle="Manage your brands"
        headerActions={headerActions}
        columns={columns}
        data={filteredBrands}
        onSearch={setSearchQuery}
        filters={filters}
        renderRowActions={renderRowActions}
      />

      <AppDialog
        visible={isAddModalVisible}
        title="Add Brand"
        onClose={() => setIsAddModalVisible(false)}
        actions={
          <>
            <AppButton 
              title="Cancel" 
              variant="secondary" 
              onPress={() => setIsAddModalVisible(false)} 
              style={{ backgroundColor: '#0F172A', minWidth: 100 }} 
            />
            <AppButton 
              title="Add Brand" 
              onPress={handleAddBrand} 
              style={{ backgroundColor: '#F97316', minWidth: 120 }} 
            />
          </>
        }
      >
        <View style={styles.imageUploadContainer}>
          <Pressable style={[styles.imageBox, { borderColor: theme.colors.border }]}>
            <Plus size={20} color={theme.colors.textSecondary} />
            <Text style={{ color: theme.colors.textSecondary, marginTop: 8, fontSize: 12 }}>Add Image</Text>
          </Pressable>
          <View style={styles.imageUploadRight}>
            <AppButton 
              title="Upload Image" 
              onPress={() => {}} 
              style={{ backgroundColor: '#F97316', alignSelf: 'flex-start', marginBottom: 8 }} 
            />
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>JPEG, PNG up to 2 MB</Text>
          </View>
        </View>

        <AppInput
          label={
            <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
              Brand <Text style={{ color: theme.colors.error }}>*</Text>
            </Text>
          }
          value={newBrandName}
          onChangeText={setNewBrandName}
        />
        <View style={styles.statusRow}>
          <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
            Status
          </Text>
          <Switch 
            value={newBrandStatus} 
            onValueChange={setNewBrandStatus} 
            trackColor={{ false: theme.colors.border, true: '#34D399' }}
            thumbColor={'#FFFFFF'}
          />
        </View>
      </AppDialog>
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
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  brandIconPlaceholder: {
    width: 24,
    height: 24,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  imageBox: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  imageUploadRight: {
    flex: 1,
    justifyContent: 'center',
  }
});
