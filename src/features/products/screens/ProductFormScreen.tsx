import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TextInput, TouchableOpacity, Pressable, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useProductStore } from '../store/productStore';
import { ProductScreenType } from '../ProductsModule';
import { v4 as uuidv4 } from 'uuid';
import { Product } from '../types';
import { Info, ChevronDown, Image as ImageIcon, Plus, Trash2, Edit, Eye, Minus, Check, Settings, LayoutGrid, ArrowLeft } from 'lucide-react-native';

interface Props {
  productId?: string | null;
  onNavigate: (screen: ProductScreenType, productId?: string) => void;
}

const ORANGE = '#FF9F43';
const BORDER = '#EBEBEB';
const TEXT_MAIN = '#333333';
const TEXT_MUTED = '#888888';
const RED = '#FF4C51';

const Card = ({ title, icon, children }: any) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.cardTitleRow}>
        {icon}
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <ChevronDown size={20} color={TEXT_MUTED} />
    </View>
    <View style={styles.cardBody}>
      {children}
    </View>
  </View>
);

const FormGroup = ({ label, required, children, actionRight, width }: any) => (
  <View style={[styles.formGroup, width ? { width } : null]}>
    <View style={styles.labelRow}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      {actionRight}
    </View>
    {children}
  </View>
);

const SelectField = ({ placeholder }: { placeholder: string }) => (
  <TouchableOpacity style={styles.inputContainer} activeOpacity={0.8}>
    <Text style={styles.inputText}>{placeholder}</Text>
    <ChevronDown size={16} color={TEXT_MAIN} />
  </TouchableOpacity>
);

const InputField = ({ placeholder, actionBtn }: { placeholder?: string, actionBtn?: string }) => (
  <View style={styles.inputContainerWithBtn}>
    <TextInput 
      style={styles.textInput} 
      placeholder={placeholder}
      placeholderTextColor="#ccc"
    />
    {actionBtn && (
      <TouchableOpacity style={styles.actionBtn}>
        <Text style={styles.actionBtnText}>{actionBtn}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const EditorField = () => (
  <View style={styles.editorContainer}>
    <View style={styles.editorToolbar}>
      <Text style={styles.toolbarText}>Normal</Text>
      <ChevronDown size={14} color={TEXT_MAIN} style={{marginRight: 16}} />
      <Text style={styles.toolbarIcon}>B</Text>
      <Text style={[styles.toolbarIcon, {fontStyle: 'italic'}]}>I</Text>
      <Text style={[styles.toolbarIcon, {textDecorationLine: 'underline'}]}>U</Text>
      {/* Simulate link and list icons with text for now */}
      <Text style={styles.toolbarIcon}>🔗</Text>
      <Text style={styles.toolbarIcon}>≣</Text>
      <Text style={styles.toolbarIcon}>≡</Text>
      <Text style={styles.toolbarIcon}>Tₓ</Text>
    </View>
    <TextInput 
      style={styles.editorInput}
      multiline
    />
  </View>
);

export const ProductFormScreen: React.FC<Props> = ({ productId, onNavigate }) => {
  const [productType, setProductType] = useState('single');

  return (
    <View style={styles.container}>
      {/* Floating Settings Icon (from screenshot) */}
      <View style={styles.floatingSettings}>
        <Settings color="white" size={24} />
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('list')}>
          <ArrowLeft size={20} color={TEXT_MAIN} />
          <Text style={styles.backButtonText}>Back to Product List</Text>
        </TouchableOpacity>

        {/* PRODUCT INFORMATION CARD */}
        <Card title="Product Information" icon={<Info size={18} color={ORANGE} />}>
          <View style={styles.grid2}>
            <FormGroup width="50%" label="Store" required>
              <SelectField placeholder="Volt Vault" />
            </FormGroup>
            <FormGroup width="50%" label="Warehouse" required>
              <SelectField placeholder="Select" />
            </FormGroup>

            <FormGroup width="50%" label="Product Name" required>
              <InputField />
            </FormGroup>
            <FormGroup width="50%" label="Slug" required>
              <InputField />
            </FormGroup>

            <FormGroup width="50%" label="SKU" required>
              <InputField actionBtn="Generate" />
            </FormGroup>
            <FormGroup width="50%" label="Selling Type" required>
              <SelectField placeholder="Select" />
            </FormGroup>

            <FormGroup 
              width="50%"
              label="Category" 
              required 
              actionRight={
                <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Plus size={14} color={ORANGE} />
                  <Text style={{color: ORANGE, fontSize: 13, marginLeft: 4}}>Add New</Text>
                </TouchableOpacity>
              }
            >
              <SelectField placeholder="Select" />
            </FormGroup>
            <FormGroup width="50%" label="Sub Category" required>
              <SelectField placeholder="Select" />
            </FormGroup>

            <FormGroup width="50%" label="Brand" required>
              <SelectField placeholder="Select" />
            </FormGroup>
            <FormGroup width="50%" label="Unit" required>
              <SelectField placeholder="Select" />
            </FormGroup>

            <FormGroup width="50%" label="Barcode Symbology" required>
              <SelectField placeholder="Select" />
            </FormGroup>
            <FormGroup width="50%" label="Item Barcode" required>
              <InputField actionBtn="Generate" />
            </FormGroup>
          </View>

          <FormGroup label="Description">
            <EditorField />
            <Text style={styles.hintText}>Maximum 60 Words</Text>
          </FormGroup>
        </Card>

        {/* PRICING & STOCKS CARD */}
        <Card title="Pricing & Stocks" icon={<LayoutGrid size={18} color={ORANGE} />}>
          <FormGroup label="Product Type" required>
            <View style={styles.radioGroup}>
              <TouchableOpacity style={styles.radioBtn} onPress={() => setProductType('single')}>
                <View style={[styles.radioCircle, productType === 'single' && styles.radioCircleActive]}>
                  {productType === 'single' && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.radioLabel, productType === 'single' && styles.radioLabelActive]}>Single Product</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.radioBtn} onPress={() => setProductType('variable')}>
                <View style={[styles.radioCircle, productType === 'variable' && styles.radioCircleActive]}>
                  {productType === 'variable' && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.radioLabel, productType === 'variable' && styles.radioLabelActive]}>Variable Product</Text>
              </TouchableOpacity>
            </View>
          </FormGroup>

          {productType === 'single' ? (
            <View style={styles.grid3}>
              <FormGroup width="33.33%" label="Quantity" required><InputField /></FormGroup>
              <FormGroup width="33.33%" label="Price" required><InputField /></FormGroup>
              <FormGroup width="33.33%" label="Tax Type" required><SelectField placeholder="Select" /></FormGroup>
              
              <FormGroup width="33.33%" label="Tax" required><SelectField placeholder="Select" /></FormGroup>
              <FormGroup width="33.33%" label="Discount Type" required><SelectField placeholder="Select" /></FormGroup>
              <FormGroup width="33.33%" label="Discount Value" required><InputField /></FormGroup>
              
              <FormGroup width="33.33%" label="Quantity Alert" required><InputField /></FormGroup>
            </View>
          ) : (
            <View>
              <FormGroup label="Variant Attribute" required>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <View style={{flex: 1}}>
                    <SelectField placeholder="Choose" />
                  </View>
                  <TouchableOpacity style={styles.addVariantBtn}>
                    <Plus size={16} color="white" />
                  </TouchableOpacity>
                </View>
              </FormGroup>

              {/* Variant Table */}
              <View style={styles.variantTable}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, {flex: 1.5}]}>Variantion</Text>
                  <Text style={[styles.tableCell, {flex: 1.5}]}>Variant Value</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>SKU</Text>
                  <Text style={[styles.tableCell, {flex: 1.2}]}>Quantity</Text>
                  <Text style={[styles.tableCell, {flex: 1.5}]}>Price</Text>
                  <Text style={[styles.tableCell, {flex: 0.8}]}></Text>
                </View>
                
                {[
                  { variation: 'color', value: 'red', sku: '1234', qty: 2, price: '50000' },
                  { variation: 'color', value: 'black', sku: '2345', qty: 3, price: '50000' }
                ].map((item, idx) => (
                  <View style={styles.tableRow} key={idx}>
                    <View style={[styles.tableCell, {flex: 1.5}]}><TextInput style={styles.tableInput} value={item.variation} /></View>
                    <View style={[styles.tableCell, {flex: 1.5}]}><TextInput style={styles.tableInput} value={item.value} /></View>
                    <View style={[styles.tableCell, {flex: 1}]}><TextInput style={styles.tableInput} value={item.sku} /></View>
                    
                    <View style={[styles.tableCell, {flex: 1.2}]}>
                      <View style={styles.qtyControl}>
                        <Minus size={14} color={TEXT_MAIN} />
                        <Text style={{marginHorizontal: 8}}>{item.qty}</Text>
                        <Plus size={14} color={TEXT_MAIN} />
                      </View>
                    </View>
                    
                    <View style={[styles.tableCell, {flex: 1.5}]}><TextInput style={styles.tableInput} value={item.price} /></View>
                    
                    <View style={[styles.tableCell, {flex: 0.8, flexDirection: 'row', justifyContent: 'flex-end', gap: 8}]}>
                      <View style={styles.iconBoxPrimary}><Check size={14} color="white" /></View>
                      <View style={styles.iconBoxOutline}><Plus size={14} color={TEXT_MAIN} /></View>
                      <View style={styles.iconBoxOutline}><Trash2 size={14} color={TEXT_MAIN} /></View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* IMAGES CARD */}
        <Card title="Images" icon={<ImageIcon size={18} color={ORANGE} />}>
          <View style={styles.imageGallery}>
            <TouchableOpacity style={styles.addImagesBox}>
              <Plus size={20} color={TEXT_MUTED} />
              <Text style={styles.addImagesText}>Add Images</Text>
            </TouchableOpacity>

            {[1, 2].map((_, i) => (
              <View key={i} style={styles.imageThumbnail}>
                <View style={styles.imagePlaceholder}>
                  <View style={[styles.phoneMockup, { backgroundColor: '#E3001B' }]} />
                </View>
                <TouchableOpacity style={styles.removeImageBtn}>
                  <Text style={{color: 'white', fontSize: 10, fontWeight: 'bold'}}>X</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </Card>

        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: TEXT_MAIN,
    fontWeight: '500',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    marginHorizontal: 'auto',
    width: '100%',
  },
  floatingSettings: {
    position: 'absolute',
    right: 0,
    top: 200,
    backgroundColor: ORANGE,
    padding: 12,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    zIndex: 100,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  cardBody: {
    padding: 20,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -10,
  },
  grid3: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -10,
  },
  formGroup: {
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: TEXT_MAIN,
    fontWeight: '400',
  },
  required: {
    color: RED,
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    paddingHorizontal: 14,
    height: 40,
    backgroundColor: 'white',
  },
  inputText: {
    color: TEXT_MAIN,
    fontSize: 14,
  },
  inputContainerWithBtn: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    overflow: 'hidden',
    height: 40,
    backgroundColor: 'white',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    color: TEXT_MAIN,
    height: '100%',
    ...(Platform.OS === 'web' && { outlineStyle: 'none' as any }),
  },
  actionBtn: {
    backgroundColor: ORANGE,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 8,
  },
  editorContainer: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    overflow: 'hidden',
  },
  editorToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#FAFAFA',
  },
  toolbarText: {
    fontSize: 14,
    marginRight: 4,
  },
  toolbarIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 8,
    color: '#555',
  },
  editorInput: {
    height: 100,
    padding: 14,
    textAlignVertical: 'top',
    fontSize: 14,
    backgroundColor: 'white',
    ...(Platform.OS === 'web' && { outlineStyle: 'none' as any }),
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 4,
  },
  radioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: ORANGE,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ORANGE,
  },
  radioLabel: {
    fontSize: 14,
    color: TEXT_MUTED,
  },
  radioLabelActive: {
    color: '#111',
  },
  addVariantBtn: {
    backgroundColor: '#1E293B', // Dark blue/slate from screenshot
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  variantTable: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9', // light slate
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  tableCell: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    paddingRight: 8,
  },
  tableInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    backgroundColor: 'white',
    ...(Platform.OS === 'web' && { outlineStyle: 'none' as any }),
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'white',
  },
  iconBoxPrimary: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: ORANGE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxOutline: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  imageGallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  addImagesBox: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  addImagesText: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 8,
  },
  imageThumbnail: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    padding: 8,
    position: 'relative',
    backgroundColor: 'white',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 4,
  },
  phoneMockup: {
    width: 40,
    height: 70,
    borderRadius: 6,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  }
});

