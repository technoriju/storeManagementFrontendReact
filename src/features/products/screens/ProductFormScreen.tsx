import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TextInput, Alert } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { useProductStore } from '../store/productStore';
import { ProductScreenType } from '../ProductsModule';
import { v4 as uuidv4 } from 'uuid';
import { Product } from '../types';

interface Props {
  productId?: string | null;
  onNavigate: (screen: ProductScreenType, productId?: string) => void;
}

export const ProductFormScreen: React.FC<Props> = ({ productId, onNavigate }) => {
  const theme = useTheme();
  const { products, addProduct, updateProduct } = useProductStore();
  const isEditing = !!productId;

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    barcode: '',
    hsn: '',
    gst: 0,
    price: 0,
    cost: 0,
    purchasePrice: 0,
    wholesalePrice: 0,
    retailPrice: 0,
    mrp: 0,
    openingStock: 0,
    stockQuantity: 0,
  });

  useEffect(() => {
    if (isEditing) {
      const productToEdit = products.find(p => p.id === productId);
      if (productToEdit) {
        setFormData(productToEdit);
      }
    }
  }, [isEditing, productId, products]);

  const handleChange = (field: keyof Product, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Validate required fields
    if (!formData.name || !formData.sku || formData.price === undefined) {
      Alert.alert('Error', 'Please fill required fields (Name, SKU, Price)');
      return;
    }

    const now = new Date().toISOString();
    
    if (isEditing && productId) {
      updateProduct({
        ...formData,
        id: productId,
        updatedAt: now,
      } as Product);
    } else {
      addProduct({
        ...formData,
        id: uuidv4(),
        stockQuantity: formData.openingStock || 0,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending'
      } as Product);
    }
    
    onNavigate('list');
  };

  const renderInput = (label: string, field: keyof Product, isNumber = false) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      <TextInput
        style={[
          styles.input, 
          { 
            backgroundColor: theme.colors.surface, 
            borderColor: theme.colors.border,
            color: theme.colors.text
          }
        ]}
        value={formData[field]?.toString() || ''}
        onChangeText={(text) => handleChange(field, isNumber ? (parseFloat(text) || 0) : text)}
        keyboardType={isNumber ? 'numeric' : 'default'}
        placeholderTextColor={theme.colors.textSecondary}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {isEditing ? 'Edit Product' : 'Add Product'}
        </Text>
        <AppButton title="Back" onPress={() => onNavigate('list')} variant="outline" />
      </View>

      <ScrollView style={styles.formContainer}>
        {renderInput('Product Name *', 'name')}
        {renderInput('SKU *', 'sku')}
        {renderInput('Barcode', 'barcode')}
        {renderInput('HSN Code', 'hsn')}
        
        <View style={styles.row}>
          <View style={styles.flex1}>{renderInput('GST (%)', 'gst', true)}</View>
          <View style={styles.spacer} />
          <View style={styles.flex1}>{renderInput('Cost', 'cost', true)}</View>
        </View>

        <View style={styles.row}>
          <View style={styles.flex1}>{renderInput('Purchase Price', 'purchasePrice', true)}</View>
          <View style={styles.spacer} />
          <View style={styles.flex1}>{renderInput('Selling Price *', 'price', true)}</View>
        </View>
        
        <View style={styles.row}>
          <View style={styles.flex1}>{renderInput('Wholesale Price', 'wholesalePrice', true)}</View>
          <View style={styles.spacer} />
          <View style={styles.flex1}>{renderInput('Retail Price', 'retailPrice', true)}</View>
        </View>
        
        <View style={styles.row}>
          <View style={styles.flex1}>{renderInput('MRP', 'mrp', true)}</View>
          <View style={styles.spacer} />
          <View style={styles.flex1}>{renderInput('Opening Stock', 'openingStock', true)}</View>
        </View>

        <AppButton title="Save Product" onPress={handleSave} style={styles.saveBtn} />
        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 20, fontWeight: 'bold' },
  formContainer: { padding: 16 },
  inputGroup: { marginBottom: 16 },
  label: { marginBottom: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  spacer: { width: 16 },
  saveBtn: { marginTop: 24, paddingVertical: 12 }
});
