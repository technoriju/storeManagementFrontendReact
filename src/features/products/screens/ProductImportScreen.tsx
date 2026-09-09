import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert, FlatList } from 'react-native';
import DocumentPicker, { types } from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import * as XLSX from 'xlsx';
import { useTheme } from '../../../shared/theme/theme';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { ProductScreenType } from '../ProductsModule';
import { useProductStore } from '../store/productStore';
import { Product } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  onNavigate: (screen: ProductScreenType) => void;
}

interface ImportRow {
  row: number;
  data: any;
  errors: string[];
  isValid: boolean;
  isDuplicate: boolean;
}

export const ProductImportScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const { products, addProduct } = useProductStore();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        presentationStyle: 'fullScreen',
        copyTo: 'cachesDirectory',
        type: [types.xls, types.xlsx, types.csv, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      });
      setSelectedFile(res);
      setParsedRows([]);
      setImportResult(null);
      parseFile(res);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // user cancelled
      } else {
        Alert.alert('Error', 'Failed to pick file');
      }
    }
  };

  const parseFile = async (file: any) => {
    setIsParsing(true);
    try {
      // Use fileCopyUri if available, otherwise uri
      const uri = file.fileCopyUri || file.uri;
      const b64 = await RNFS.readFile(uri, 'base64');
      const workbook = XLSX.read(b64, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const rows: ImportRow[] = data.map((item: any, index: number) => {
        const errors: string[] = [];
        let isValid = true;
        let isDuplicate = false;

        const name = item['Product Name'] || item.Name;
        const sku = item.SKU || item['Product Code'];
        const price = item['Retail Price'] || item.MRP || item.Price;

        if (!name) {
          errors.push('Name is required');
          isValid = false;
        }
        if (!sku) {
          errors.push('SKU / Product Code is required');
          isValid = false;
        }
        if (price === undefined || isNaN(Number(price))) {
          errors.push('Valid Price is required');
          isValid = false;
        }

        if (sku) {
          const exists = products.find(p => p.sku === String(sku));
          if (exists) {
            isDuplicate = true;
            errors.push('Duplicate SKU found in existing products');
            isValid = false;
          }
        }

        return {
          row: index + 2, // Excel rows are 1-indexed, +1 for header
          data: item,
          errors,
          isValid,
          isDuplicate,
        };
      });

      setParsedRows(rows);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to parse Excel file. Please ensure it is a valid format.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      Alert.alert('No valid rows', 'There are no valid rows to import.');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const name = row.data['Product Name'] || row.data.Name;
        const sku = row.data.SKU || row.data['Product Code'];
        const price = Number(row.data['Retail Price'] || row.data.MRP || row.data.Price);
        const cost = Number(row.data['Purchase Price'] || row.data.Cost || 0);

        const newProduct: Product = {
          id: uuidv4(),
          name: String(name),
          sku: String(sku),
          price: price,
          cost: cost,
          stockQuantity: Number(row.data['Opening Stock']) || 0,
          barcode: row.data.Barcode ? String(row.data.Barcode) : undefined,
          hsn: row.data['HSN Code'] ? String(row.data['HSN Code']) : undefined,
          gst: row.data['GST %'] ? Number(row.data['GST %']) : undefined,
          description: row.data.Description ? String(row.data.Description) : undefined,
          mrp: row.data.MRP ? Number(row.data.MRP) : undefined,
          purchasePrice: cost,
          retailPrice: price,
          wholesalePrice: row.data['Wholesale Price'] ? Number(row.data['Wholesale Price']) : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: 'pending'
        };

        addProduct(newProduct);
        successCount++;
      } catch {
        failedCount++;
      }
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
      // Add a small delay to allow UI to update if needed, but synchronous is fine for small files.
      await new Promise(resolve => setTimeout(() => resolve(true), 10));
    }

    setIsImporting(false);
    setImportResult({ success: successCount, failed: failedCount });
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const errorCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Product Import</Text>
        <AppButton title="Back" onPress={() => onNavigate('list')} variant="outline" />
      </View>
      <View style={styles.content}>
        {!selectedFile ? (
          <View style={styles.center}>
            <Text style={[styles.instructions, { color: theme.colors.textSecondary }]}>
              Please select an Excel (.xlsx, .xls) or CSV file matching the Product_Import_Template format.
            </Text>
            <AppButton title="Select File" onPress={handlePickFile} />
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <View style={styles.fileInfo}>
              <Text style={[{ color: theme.colors.text }]}>File: {selectedFile.name}</Text>
              <AppButton title="Change File" onPress={handlePickFile} variant="outline" size="small" />
            </View>

            {isParsing ? (
              <Text style={[{ color: theme.colors.textSecondary, marginTop: 20 }]}>Parsing file...</Text>
            ) : importResult ? (
              <View style={styles.resultContainer}>
                <Text style={[styles.resultText, { color: theme.colors.text }]}>Import Complete</Text>
                <Text style={{ color: theme.colors.success }}>Successfully imported: {importResult.success}</Text>
                <Text style={{ color: theme.colors.error }}>Failed: {importResult.failed}</Text>
                <AppButton title="Done" onPress={() => onNavigate('list')} style={{ marginTop: 20 }} />
              </View>
            ) : (
              <>
                <View style={styles.stats}>
                  <Text style={[{ color: theme.colors.text }]}>Total Rows: {parsedRows.length}</Text>
                  <Text style={[{ color: theme.colors.success }]}>Valid: {validCount}</Text>
                  <Text style={[{ color: theme.colors.error }]}>Errors: {errorCount}</Text>
                </View>

                {parsedRows.length > 0 && (
                  <FlatList
                    data={parsedRows}
                    keyExtractor={(item, index) => String(index)}
                    style={styles.list}
                    renderItem={({ item }) => (
                      <View style={[styles.rowItem, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                        <View style={styles.rowHeader}>
                          <Text style={[{ color: theme.colors.text, fontWeight: 'bold' }]}>Row {item.row}: {item.data['Product Name'] || item.data.Name || 'Unknown'}</Text>
                          {item.isValid ? (
                            <Text style={{ color: theme.colors.success }}>Valid</Text>
                          ) : (
                            <Text style={{ color: theme.colors.error }}>Error</Text>
                          )}
                        </View>
                        {!item.isValid && (
                          <View style={styles.errorList}>
                            {item.errors.map((err, i) => (
                              <Text key={i} style={{ color: theme.colors.error, fontSize: 12 }}>• {err}</Text>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  />
                )}

                <View style={styles.actions}>
                  {isImporting ? (
                    <View style={styles.progressContainer}>
                      <Text style={[{ color: theme.colors.text }]}>Importing... {importProgress}%</Text>
                    </View>
                  ) : (
                    <AppButton 
                      title={`Import ${validCount} Valid Products`} 
                      onPress={() => {
                        Alert.alert(
                          'Confirm Import',
                          `Are you sure you want to import ${validCount} products?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Import', onPress: handleImport }
                          ]
                        );
                      }} 
                      disabled={validCount === 0}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  instructions: { marginBottom: 20, textAlign: 'center', paddingHorizontal: 20 },
  previewContainer: { flex: 1 },
  fileInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  stats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 8 },
  list: { flex: 1, marginBottom: 16 },
  rowItem: { padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 8 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  errorList: { marginTop: 8 },
  actions: { paddingVertical: 10 },
  progressContainer: { padding: 16, alignItems: 'center', backgroundColor: '#e0f2fe', borderRadius: 8 },
  resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  resultText: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 }
});
