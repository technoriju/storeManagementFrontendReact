import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, Switch, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useSubCategoryStore } from '../store/subCategoryStore';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { AppDialog } from '../../../shared/components/feedback/AppDialog';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
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
  Image as ImageIcon,
  Plus
} from 'lucide-react-native';

export const SubCategoryListScreen = () => {
  const theme = useTheme();
  const { subCategories, addSubCategory } = useSubCategoryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  
  const [newSubCategory, setNewSubCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState(true);

  const categoryOptions = [
    { label: 'Computers', value: 'Computers' },
    { label: 'Shoe', value: 'Shoe' },
    { label: 'Electronics', value: 'Electronics' },
    { label: 'Bags', value: 'Bags' },
    { label: 'Furniture', value: 'Furniture' },
  ];

  const columns = [
    { 
      key: 'image', 
      title: 'Image', 
      width: 80,
      render: () => (
        <View style={{ width: 32, height: 32, backgroundColor: '#F1F5F9', borderRadius: 4, justifyContent: 'center', alignItems: 'center' }}>
          <ImageIcon size={16} color={theme.colors.textSecondary} />
        </View>
      )
    },
    { 
      key: 'subCategory', 
      title: 'Sub Category', 
      flex: 2,
      minWidth: 150,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
    },
    { 
      key: 'category', 
      title: 'Category', 
      flex: 2,
      minWidth: 150,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
    },
    { 
      key: 'categoryCode', 
      title: 'Category Code', 
      flex: 1.5,
      minWidth: 120,
      render: (value: string) => <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
    },
    { 
      key: 'description', 
      title: 'Description', 
      flex: 2,
      minWidth: 150,
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
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>{value}</Text>
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
        <Text style={styles.primaryActionText}>Add Sub Category</Text>
      </Pressable>
    </>
  );

  const filters = (
    <>
      <View style={[styles.filterDropdown, { borderColor: theme.colors.border, marginRight: 8 }]}>
        <Text style={{ color: theme.colors.text }}>Category</Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
      </View>
      <View style={[styles.filterDropdown, { borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.text }}>Status</Text>
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

  const handleAddSubCategory = () => {
    if (!newSubCategory || !newCategory || !newCategoryCode) return;
    addSubCategory({
      id: Math.random().toString(),
      subCategory: newSubCategory,
      category: newCategory,
      categoryCode: newCategoryCode,
      description: newDescription,
      status: newStatus ? 'Active' : 'Inactive',
    });
    setNewSubCategory('');
    setNewCategory('');
    setNewCategoryCode('');
    setNewDescription('');
    setNewStatus(true);
    setIsAddModalVisible(false);
  };

  const filteredSubCategories = subCategories.filter(c => 
    c.subCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.categoryCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AdvancedTable
        title="Sub Category"
        subtitle="Manage your sub categories"
        headerActions={headerActions}
        columns={columns}
        data={filteredSubCategories}
        onSearch={setSearchQuery}
        filters={filters}
        renderRowActions={renderRowActions}
      />

      <AppDialog
        visible={isAddModalVisible}
        title="Add Sub Category"
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
              title="Add Sub Category" 
              onPress={handleAddSubCategory} 
              style={{ backgroundColor: '#F97316', minWidth: 140 }} 
            />
          </>
        }
      >
        <View style={styles.imageUploadContainer}>
          <TouchableOpacity style={[styles.imagePlaceholder, { borderColor: theme.colors.border }]}>
            <Plus size={20} color={theme.colors.textSecondary} />
            <Text style={{ color: theme.colors.textSecondary, marginTop: 4, fontSize: 12 }}>Add Image</Text>
          </TouchableOpacity>
          <View style={styles.uploadRight}>
            <AppButton title="Upload Image" onPress={() => {}} style={{ backgroundColor: '#F97316', height: 36, paddingHorizontal: 16 }} />
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 8 }}>JPEG, PNG up to 2 MB</Text>
          </View>
        </View>

        <AppSelect
          label={
            <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
              Category <Text style={{ color: theme.colors.error }}>*</Text>
            </Text>
          }
          placeholder="Select"
          options={categoryOptions}
          value={newCategory}
          onSelect={setNewCategory}
        />
        
        <AppInput
          label={
            <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
              Sub Category <Text style={{ color: theme.colors.error }}>*</Text>
            </Text>
          }
          value={newSubCategory}
          onChangeText={setNewSubCategory}
        />

        <AppInput
          label={
            <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
              Category Code <Text style={{ color: theme.colors.error }}>*</Text>
            </Text>
          }
          value={newCategoryCode}
          onChangeText={setNewCategoryCode}
        />

        <AppInput
          label={
            <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
              Description <Text style={{ color: theme.colors.error }}>*</Text>
            </Text>
          }
          value={newDescription}
          onChangeText={setNewDescription}
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top' }}
        />

        <View style={styles.statusRow}>
          <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
            Status
          </Text>
          <Switch 
            value={newStatus} 
            onValueChange={setNewStatus} 
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
    marginRight: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  imageUploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  uploadRight: {
    marginLeft: 20,
    justifyContent: 'center',
  }
});
