import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert, FlatList, Platform, ScrollView } from 'react-native';
import DocumentPicker, { types } from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import * as XLSX from 'xlsx';
import { useTheme } from '../../../shared/theme/theme';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { ProductScreenType } from '../ProductsModule';
import { useProductStore } from '../store/productStore';
import { Product as ModelProduct, Category as ModelCategory, Brand as ModelBrand, Unit as ModelUnit } from '../../../types/models';
import { productRepository } from '../../../core/repositories/ProductRepository';
import { categoryRepository } from '../../../core/repositories/CategoryRepository';
import { brandRepository } from '../../../core/repositories/BrandRepository';
import { unitRepository } from '../../../core/repositories/UnitRepository';

interface Props {
  onNavigate: (screen: ProductScreenType) => void;
}

interface ParsedProductRow {
  row: number;
  name: string;
  code?: string;
  sku: string;
  categoryName?: string;
  brandName?: string;
  unitName?: string;
  subunitVal?: any;
  purchasePrice: number;
  wholesalePrice: number;
  retailPrice: number;
  mrp: number;
  openingStock: number;
  barcode?: string;
  hsn?: string;
  gst: number;
  description?: string;
  errors: string[];
  isValid: boolean;
  isDuplicate: boolean;
}

const getColValue = (row: any, ...aliases: string[]): any => {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== '') {
      return row[alias];
    }
  }
  const rowKeys = Object.keys(row);
  for (const alias of aliases) {
    const normAlias = alias.toLowerCase().replace(/[\s_%-]/g, '');
    for (const key of rowKeys) {
      const normKey = key.toLowerCase().replace(/[\s_%-]/g, '');
      if (normAlias === normKey) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
          return row[key];
        }
      }
    }
  }
  return undefined;
};

const parseNum = (val: any): number => {
  if (val === undefined || val === null || String(val).trim() === '') return 0;
  const n = Number(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

const parseStr = (val: any): string | undefined => {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim();
  return s === '' || s.toLowerCase() === 'null' ? undefined : s;
};

export const ProductImportScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const { products, addProduct, addCategory, addBrand, addUnit, fetchProducts } = useProductStore();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const handlePickFile = async () => {
    if (Platform.OS === 'web') {
      try {
        const doc = (globalThis as any).document;
        if (!doc) return;
        const input = doc.createElement('input');
        input.type = 'file';
        input.accept = '.csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setSelectedFile({ name: file.name, file });
          setParsedRows([]);
          setImportResult(null);
          parseWebFile(file);
        };
        input.click();
      } catch (err) {
        Alert.alert('Error', 'Failed to pick file on web');
      }
      return;
    }

    try {
      const res = await DocumentPicker.pickSingle({
        presentationStyle: 'fullScreen',
        copyTo: 'cachesDirectory',
        type: [types.xls, types.xlsx, types.csv, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      });
      setSelectedFile(res);
      setParsedRows([]);
      setImportResult(null);
      parseNativeFile(res);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Error', 'Failed to pick file');
      }
    }
  };

  const parseWebFile = (file: any) => {
    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        processWorkbook(workbook);
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to parse Excel file');
      } finally {
        setIsParsing(false);
      }
    };
    reader.onerror = () => {
      setIsParsing(false);
      Alert.alert('Error', 'Failed to read file');
    };
    reader.readAsArrayBuffer(file);
  };

  const parseNativeFile = async (file: any) => {
    setIsParsing(true);
    try {
      const uri = file.fileCopyUri || file.uri;
      const b64 = await RNFS.readFile(uri, 'base64');
      const workbook = XLSX.read(b64, { type: 'base64' });
      processWorkbook(workbook);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to parse Excel file. Please ensure it is a valid format.');
    } finally {
      setIsParsing(false);
    }
  };

  const processWorkbook = (workbook: XLSX.WorkBook) => {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    const existingSkus = new Set(products.map((p) => String(p.sku || '').trim().toLowerCase()));
    const seenInBatch = new Set<string>();

    const rows: ParsedProductRow[] = rawData.map((item: any, index: number) => {
      const errors: string[] = [];
      let isValid = true;
      let isDuplicate = false;

      const name = parseStr(getColValue(item, 'Product Name', 'Name', 'product_name')) || '';
      const code = parseStr(getColValue(item, 'Product Code', 'Code', 'product_code'));
      const sku = parseStr(getColValue(item, 'SKU', 'sku')) || code || `P-${Date.now()}-${index + 1}`;

      const categoryName = parseStr(getColValue(item, 'Category', 'category', 'category_name'));
      const brandName = parseStr(getColValue(item, 'Brand', 'brand', 'brand_name'));
      const unitName = parseStr(getColValue(item, 'Unit', 'unit', 'Base Unit', 'base_unit'));
      const subunitVal = getColValue(item, 'Subunit', 'subunit', 'Sub Unit', 'sub_unit');

      // Numeric values: blank -> 0
      const purchasePrice = parseNum(getColValue(item, 'Purchase Price', 'Cost', 'purchase_price', 'cost'));
      const wholesalePrice = parseNum(getColValue(item, 'Wholesale Price', 'wholesale_price'));
      const retailPrice = parseNum(getColValue(item, 'Retail Price', 'Price', 'retail_price', 'price'));
      const mrp = parseNum(getColValue(item, 'MRP', 'mrp'));
      const openingStock = parseNum(getColValue(item, 'Opening Stock', 'Stock', 'stock_quantity', 'opening_stock', 'stockQuantity'));
      const gst = parseNum(getColValue(item, 'GST %', 'GST', 'gst', 'tax'));

      // String values: blank -> undefined (database NULL)
      const barcode = parseStr(getColValue(item, 'Barcode', 'barcode'));
      const hsn = parseStr(getColValue(item, 'HSN Code', 'HSN', 'hsn', 'hsn_code'));
      const description = parseStr(getColValue(item, 'Description', 'description'));

      // Validation 1: Product Name is mandatory
      if (!name) {
        errors.push('Product Name is required');
        isValid = false;
      }

      // Validation 2: Duplicate check
      const normSku = sku.toLowerCase();
      if (seenInBatch.has(normSku)) {
        isDuplicate = true;
        errors.push(`Duplicate SKU "${sku}" repeated in file (remove template sample rows)`);
        isValid = false;
      } else {
        seenInBatch.add(normSku);
        if (existingSkus.has(normSku)) {
          isDuplicate = true;
          errors.push(`SKU "${sku}" already exists in product database`);
          isValid = false;
        }
      }

      return {
        row: index + 2, // Excel 1-indexed, header is row 1
        name,
        code,
        sku,
        categoryName,
        brandName,
        unitName,
        subunitVal,
        purchasePrice,
        wholesalePrice,
        retailPrice,
        mrp,
        openingStock,
        barcode,
        hsn,
        gst,
        description,
        errors,
        isValid,
        isDuplicate,
      };
    });

    setParsedRows(rows);
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      Alert.alert('No valid rows', 'There are no valid rows to import.');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    let successCount = 0;
    let failedCount = 0;

    try {
      // 1. Preload local categories, units, brands
      const existingCategories = await categoryRepository.getAll();
      const existingUnits = await unitRepository.getAll();
      const existingBrands = await brandRepository.getAll();

      const catMap = new Map<string, ModelCategory>();
      existingCategories.forEach((c) => catMap.set(c.name.trim().toLowerCase(), c));

      const unitMap = new Map<string, ModelUnit>();
      existingUnits.forEach((u) => {
        unitMap.set(u.name.trim().toLowerCase(), u);
        if (u.shortName) unitMap.set(u.shortName.trim().toLowerCase(), u);
      });

      const brandMap = new Map<string, ModelBrand>();
      existingBrands.forEach((b) => brandMap.set(b.name.trim().toLowerCase(), b));

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        try {
          // Auto-resolve or Auto-create Category
          let categoryId: number | undefined = undefined;
          if (row.categoryName) {
            const normCat = row.categoryName.trim().toLowerCase();
            if (catMap.has(normCat)) {
              categoryId = catMap.get(normCat)!.id;
            } else {
              const newCat: ModelCategory = {
                id: Math.floor(Math.random() * -1000000000),
                name: row.categoryName.trim(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                syncStatus: 'pending_insert',
              };
              await categoryRepository.insert(newCat);
              catMap.set(normCat, newCat);
              addCategory(newCat as any);
              categoryId = newCat.id;
            }
          }

          // Auto-resolve or Auto-create Unit
          let unitId: number | undefined = undefined;
          if (row.unitName) {
            const normUnit = row.unitName.trim().toLowerCase();
            if (unitMap.has(normUnit)) {
              unitId = unitMap.get(normUnit)!.id;
            } else {
              const uName = row.unitName.trim();
              const newUnit: ModelUnit = {
                id: Math.floor(Math.random() * -1000000000),
                name: uName,
                shortName: uName.length <= 10 ? uName.toLowerCase() : uName.substring(0, 10).toLowerCase(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                syncStatus: 'pending_insert',
              };
              await unitRepository.insert(newUnit);
              unitMap.set(normUnit, newUnit);
              addUnit(newUnit as any);
              unitId = newUnit.id;
            }
          }

          // Auto-resolve or Auto-create Brand
          let brandId: number | undefined = undefined;
          if (row.brandName) {
            const normBrand = row.brandName.trim().toLowerCase();
            if (brandMap.has(normBrand)) {
              brandId = brandMap.get(normBrand)!.id;
            } else {
              const newBrand: ModelBrand = {
                id: Math.floor(Math.random() * -1000000000),
                name: row.brandName.trim(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                syncStatus: 'pending_insert',
              };
              await brandRepository.insert(newBrand);
              brandMap.set(normBrand, newBrand);
              addBrand(newBrand as any);
              brandId = newBrand.id;
            }
          }

          // Subunit conversion rate
          const rawSub = Number(row.subunitVal);
          const conversionRate = !isNaN(rawSub) && rawSub > 0 ? rawSub : 1;

          // Assemble product entity
          const newProduct: ModelProduct = {
            id: Math.floor(Math.random() * -1000000000),
            name: row.name,
            sku: row.sku,
            productCode: row.code || row.sku,
            price: row.retailPrice,
            cost: row.purchasePrice,
            purchasePrice: row.purchasePrice,
            wholesalePrice: row.wholesalePrice,
            retailPrice: row.retailPrice,
            mrp: row.mrp,
            stockQuantity: row.openingStock,
            openingStock: row.openingStock,
            barcode: row.barcode,
            hsn: row.hsn,
            gst: row.gst,
            description: row.description,
            categoryId,
            categoryName: row.categoryName,
            brandId,
            brandName: row.brandName,
            unitId,
            baseUnitId: unitId,
            conversionRate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            syncStatus: 'pending_insert',
          };

          // Save to local SQLite database (which automatically syncs to backend API)
          await productRepository.insert(newProduct);
          addProduct(newProduct as any);
          successCount++;
        } catch (rowErr) {
          console.error(`Import failed at row ${row.row}:`, rowErr);
          failedCount++;
        }

        setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
        await new Promise<void>((resolve) => setTimeout(() => resolve(), 5));
      }

      try {
        await fetchProducts();
      } catch (_) {}
    } catch (err) {
      console.error('Import overall error:', err);
    } finally {
      setIsImporting(false);
      setImportResult({ success: successCount, failed: failedCount });
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Import Product</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
            Upload CSV/Excel file to bulk create products
          </Text>
        </View>
        <AppButton title="Back to List" onPress={() => onNavigate('list')} variant="outline" size="small" />
      </View>

      <View style={styles.content}>
        {!selectedFile ? (
          <View style={styles.center}>
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>CSV / Excel Upload Only</Text>
              <Text style={[styles.instructions, { color: theme.colors.textSecondary }]}>
                Only CSV or Excel file is needed. Product Name is required. All blank numeric fields default to 0. Blank text fields set to NULL. Missing Categories, Brands, and Units are automatically created.
              </Text>

              <View style={styles.buttonRow}>
                <AppButton title="Select CSV / Excel File" onPress={handlePickFile} />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            {/* File info bar */}
            <View style={[styles.fileInfo, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 14 }}>
                File: {selectedFile.name}
              </Text>
              <AppButton title="Change File" onPress={handlePickFile} variant="outline" size="small" />
            </View>

            {isParsing ? (
              <View style={styles.center}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>Parsing spreadsheet...</Text>
              </View>
            ) : importResult ? (
              <View style={[styles.resultCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.resultTitle, { color: theme.colors.text }]}>Import Complete</Text>
                <Text style={{ color: theme.colors.success, fontSize: 16, marginVertical: 6, fontWeight: '600' }}>
                  Successfully Imported: {importResult.success} products
                </Text>
                {importResult.failed > 0 && (
                  <Text style={{ color: theme.colors.error, fontSize: 14, marginBottom: 12 }}>
                    Failed: {importResult.failed} products
                  </Text>
                )}
                <AppButton title="View Product List" onPress={() => onNavigate('list')} style={{ marginTop: 16 }} />
              </View>
            ) : (
              <>
                {/* Stats */}
                <View style={[styles.stats, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Total: {parsedRows.length}</Text>
                  <Text style={{ color: theme.colors.success, fontWeight: '600' }}>Valid: {validCount}</Text>
                  <Text style={{ color: errorCount > 0 ? theme.colors.error : theme.colors.textSecondary, fontWeight: '600' }}>
                    Errors: {errorCount}
                  </Text>
                </View>

                {/* Rows preview list */}
                <FlatList
                  data={parsedRows}
                  keyExtractor={(item) => String(item.row)}
                  style={styles.list}
                  renderItem={({ item }) => (
                    <View style={[styles.rowItem, { borderColor: item.isValid ? theme.colors.border : '#EF4444', backgroundColor: theme.colors.surface }]}>
                      <View style={styles.rowHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.colors.text, fontWeight: 'bold', fontSize: 14 }}>
                            Row {item.row}: {item.name || '(Empty Name)'}
                          </Text>
                          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                            SKU: {item.sku} | Cat: {item.categoryName || 'None'} | Unit: {item.unitName || 'None'} | Subunit: {item.subunitVal || '1'} | Cost: ₹{item.purchasePrice} | Retail: ₹{item.retailPrice}
                          </Text>
                        </View>
                        <View style={{ paddingLeft: 8 }}>
                          {item.isValid ? (
                            <Text style={{ color: theme.colors.success, fontWeight: '600' }}>Ready</Text>
                          ) : (
                            <Text style={{ color: theme.colors.error, fontWeight: '600' }}>Error</Text>
                          )}
                        </View>
                      </View>

                      {!item.isValid && item.errors.length > 0 && (
                        <View style={styles.errorList}>
                          {item.errors.map((err, i) => (
                            <Text key={i} style={{ color: theme.colors.error, fontSize: 12 }}>
                              • {err}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                />

                {/* Import Action */}
                <View style={styles.actions}>
                  {isImporting ? (
                    <View style={[styles.progressContainer, { backgroundColor: '#E0F2FE' }]}>
                      <Text style={{ color: '#0369A1', fontWeight: '600', fontSize: 15 }}>
                        Importing Products & Syncing Master Data... {importProgress}%
                      </Text>
                    </View>
                  ) : (
                    <AppButton
                      title={`Import ${validCount} Valid Products`}
                      disabled={validCount === 0}
                      onPress={() => {
                        Alert.alert(
                          'Confirm Import',
                          `Import ${validCount} products? Missing categories, units, and brands will be auto-created.`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Import Now', onPress: handleImport },
                          ]
                        );
                      }}
                    />
                  )}
                </View>
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 500,
    width: '100%',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  instructions: { marginBottom: 24, textAlign: 'center', lineHeight: 20, fontSize: 14 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  previewContainer: { flex: 1 },
  fileInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  list: { flex: 1, marginBottom: 12 },
  rowItem: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  errorList: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#FEE2E2', paddingTop: 6 },
  actions: { paddingVertical: 10 },
  progressContainer: { padding: 16, alignItems: 'center', borderRadius: 8 },
  resultCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultTitle: { fontSize: 22, fontWeight: 'bold' },
});
