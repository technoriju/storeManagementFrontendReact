import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  Trash2,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Table as TableIcon,
  Search,
  Eye,
  AlertOctagon,
  X,
} from 'lucide-react-native';
import { db } from '../../../core/database/db';
import { useTheme } from '../../../shared/theme/theme';

// Order matters for relational databases: delete children before parents
const DELETION_ORDER = [
  // 1. Transaction line items & child records
  'sale_items',
  'purchase_items',
  'purchase_order_items',
  'quotation_items',
  'sale_return_items',
  'purchase_return_items',
  'stock_transactions',
  'payments',
  // 2. Transaction headers & sync
  'sales',
  'purchases',
  'purchase_orders',
  'quotations',
  'sale_returns',
  'purchase_returns',
  'expenses',
  'outbox',
  'sync_metadata',
  'tombstones',
  // 3. Catalog items
  'products',
  'unit_conversions',
  'sub_categories',
  'sub_units',
  // 4. Primary entities & settings
  'categories',
  'brands',
  'units',
  'customers',
  'suppliers',
  'settings',
  'users',
];

interface TableMeta {
  name: string;
  rowCount: number;
}

export const LocalDbManager = ({ action }: { action: 'view_local_db' | 'delete_local_db' }) => {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'view' | 'delete'>(
    action === 'delete_local_db' ? 'delete' : 'view'
  );
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('products');
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [inlineConfirming, setInlineConfirming] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    setActiveTab(action === 'delete_local_db' ? 'delete' : 'view');
    setInlineConfirming(false);
  }, [action]);

  const extractRows = (res: any): any[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.rows) {
      if (Array.isArray(res.rows)) return res.rows;
      if (Array.isArray(res.rows._array)) return res.rows._array;
      if (typeof res.rows.length === 'number') {
        const arr = [];
        for (let i = 0; i < res.rows.length; i++) {
          arr.push(typeof res.rows.item === 'function' ? res.rows.item(i) : res.rows[i]);
        }
        return arr;
      }
    }
    if (Array.isArray(res._array)) return res._array;
    return [];
  };

  const getTableNames = useCallback(async (): Promise<string[]> => {
    const discovered: string[] = [];
    try {
      const res = await db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'android_metadata'"
      );
      const rows = extractRows(res);
      for (const r of rows) {
        const name = typeof r === 'string' ? r : (r?.name || r?.tbl_name || (Array.isArray(r) ? r[0] : null));
        if (name && typeof name === 'string' && !discovered.includes(name)) {
          discovered.push(name);
        }
      }
    } catch (e) {
      console.warn('Could not read sqlite_master, using fallback list:', e);
    }

    const all = Array.from(new Set([...discovered, ...DELETION_ORDER]));
    return all;
  }, []);

  const loadTablesWithCounts = useCallback(async () => {
    try {
      setLoading(true);
      const names = await getTableNames();
      const metaList: TableMeta[] = [];

      for (const name of names) {
        let count = 0;
        try {
          const res = await db.execute(`SELECT COUNT(*) as cnt FROM "${name}"`);
          const rows = extractRows(res);
          if (rows.length > 0) {
            const first = rows[0];
            count = Number(first?.cnt ?? first?.['COUNT(*)'] ?? (Array.isArray(first) ? first[0] : 0));
          }
        } catch {
          count = 0;
        }
        metaList.push({ name, rowCount: count });
      }

      metaList.sort((a, b) => a.name.localeCompare(b.name));
      setTables(metaList);

      if (metaList.length > 0 && !metaList.some((t) => t.name === selectedTable)) {
        setSelectedTable(metaList[0].name);
      }
    } catch (e: any) {
      console.error('Failed to load tables:', e);
      setStatusMessage({ type: 'error', text: `Failed to load table list: ${e.message}` });
    } finally {
      setLoading(false);
    }
  }, [getTableNames, selectedTable]);

  const loadTableData = useCallback(async (tableName: string) => {
    try {
      setLoadingData(true);
      const res = await db.execute(`SELECT * FROM "${tableName}" LIMIT 100`);
      const rows = extractRows(res);
      setTableData(rows);
    } catch (e: any) {
      console.error(`Failed to load data for ${tableName}:`, e);
      setTableData([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadTablesWithCounts();
  }, [loadTablesWithCounts]);

  useEffect(() => {
    if (selectedTable && activeTab === 'view') {
      loadTableData(selectedTable);
    }
  }, [selectedTable, activeTab, loadTableData]);

  const handleDeleteAllData = async () => {
    try {
      setLoading(true);
      setStatusMessage(null);

      // 1. Try disabling foreign keys (safely ignored if unsupported)
      try {
        await db.execute('PRAGMA foreign_keys = OFF');
      } catch (err) {
        console.warn('PRAGMA foreign_keys OFF not supported:', err);
      }

      const discoveredNames = await getTableNames();

      // Order tables: children first, parents last
      const ordered = [
        ...DELETION_ORDER.filter((t) => discoveredNames.includes(t)),
        ...discoveredNames.filter((t) => !DELETION_ORDER.includes(t)),
      ];

      let clearedTables = 0;
      let totalDeletedRows = 0;

      // Pass 1: delete in dependency order
      for (const tbl of ordered) {
        try {
          // Count rows before deleting
          try {
            const countRes = await db.execute(`SELECT COUNT(*) as cnt FROM "${tbl}"`);
            const rows = extractRows(countRes);
            const cnt = rows.length > 0 ? (rows[0]?.cnt ?? rows[0]?.['COUNT(*)'] ?? 0) : 0;
            totalDeletedRows += Number(cnt);
          } catch {
            // ignore count error
          }

          await db.execute(`DELETE FROM "${tbl}"`);
          clearedTables++;
        } catch (err: any) {
          console.warn(`Pass 1 error on ${tbl}:`, err?.message || err);
        }
      }

      // Pass 2: Clean up any remaining records
      for (const tbl of ordered) {
        try {
          await db.execute(`DELETE FROM "${tbl}"`);
        } catch {
          // ignore
        }
      }

      // Reset autoincrement sequence
      try {
        await db.execute('DELETE FROM sqlite_sequence');
      } catch {
        // ignore
      }

      // Re-enable foreign keys
      try {
        await db.execute('PRAGMA foreign_keys = ON');
      } catch {
        // ignore
      }

      // Clear React Query cache
      try {
        queryClient.clear();
        await queryClient.invalidateQueries();
      } catch (err) {
        console.warn('Failed clearing query cache:', err);
      }

      // Refresh table counts & data
      await loadTablesWithCounts();
      if (selectedTable) {
        await loadTableData(selectedTable);
      }

      setInlineConfirming(false);
      setStatusMessage({
        type: 'success',
        text: `All local database data deleted! Cleared ${clearedTables} tables (${totalDeletedRows} records removed).`,
      });
    } catch (e: any) {
      console.error('Failed to delete all data:', e);
      setStatusMessage({
        type: 'error',
        text: `Failed to delete local data: ${e?.message || 'Unknown error'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearSingleTable = async (tableName: string) => {
    try {
      setLoading(true);
      setStatusMessage(null);
      await db.execute(`DELETE FROM "${tableName}"`);
      await loadTablesWithCounts();
      await loadTableData(tableName);
      try {
        queryClient.invalidateQueries();
      } catch {
        // ignore
      }
      setStatusMessage({
        type: 'success',
        text: `Table '${tableName}' data cleared successfully.`,
      });
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: `Failed to clear table ${tableName}: ${e?.message || 'Foreign key constraint'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const totalRecords = tables.reduce((sum, t) => sum + t.rowCount, 0);

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(searchFilter.toLowerCase().trim())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Header Card */}
      <View style={[styles.headerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerLeft}>
            <Database size={24} color={theme.colors.primary} style={{ marginRight: 10 }} />
            <View>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Local Database Manager</Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                {tables.length} tables · {totalRecords} total records stored locally
              </Text>
            </View>
          </View>

          <View style={styles.tabButtons}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'view' && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => {
                setActiveTab('view');
                setInlineConfirming(false);
              }}
            >
              <Eye size={16} color={activeTab === 'view' ? '#FFFFFF' : theme.colors.textSecondary} style={{ marginRight: 6 }} />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'view' ? '#FFFFFF' : theme.colors.textSecondary },
                ]}
              >
                View Tables
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'delete' && { backgroundColor: theme.colors.error },
              ]}
              onPress={() => setActiveTab('delete')}
            >
              <Trash2 size={16} color={activeTab === 'delete' ? '#FFFFFF' : theme.colors.textSecondary} style={{ marginRight: 6 }} />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'delete' ? '#FFFFFF' : theme.colors.textSecondary },
                ]}
              >
                Delete Data
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.refreshIconBtn, { borderColor: theme.colors.border }]}
              onPress={() => {
                loadTablesWithCounts();
                if (selectedTable) loadTableData(selectedTable);
              }}
              disabled={loading}
            >
              <RefreshCw size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Message Banner */}
        {statusMessage && (
          <View
            style={[
              styles.statusBanner,
              statusMessage.type === 'success' && { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
              statusMessage.type === 'error' && { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
              statusMessage.type === 'info' && { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
            ]}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={18} color="#10B981" style={{ marginRight: 8 }} />
            ) : (
              <AlertTriangle size={18} color="#EF4444" style={{ marginRight: 8 }} />
            )}
            <Text
              style={[
                styles.statusBannerText,
                { color: statusMessage.type === 'success' ? '#065F46' : '#991B1B' },
              ]}
            >
              {statusMessage.text}
            </Text>
            <TouchableOpacity onPress={() => setStatusMessage(null)}>
              <X size={16} color={statusMessage.type === 'success' ? '#065F46' : '#991B1B'} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main Content Area */}
      {activeTab === 'delete' ? (
        <ScrollView style={styles.scrollArea}>
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.dangerHeader}>
              <View style={styles.dangerIconBadge}>
                <Trash2 size={28} color="#EF4444" />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Wipe Local Database</Text>
                <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                  Permanently deletes all rows from all local SQLite tables on this device.
                </Text>
              </View>
            </View>

            <View style={styles.warningBox}>
              <AlertTriangle size={20} color="#D97706" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.warningTitle}>Important Notice</Text>
                <Text style={styles.warningText}>
                  This clears all locally stored records including products, sales, customers, stock transactions, and offline outbox.
                </Text>
              </View>
            </View>

            {/* Table Breakdown Summary */}
            <Text style={[styles.breakdownHeader, { color: theme.colors.text }]}>
              Current Stored Records by Table ({totalRecords} total):
            </Text>
            <View style={styles.tableGrid}>
              {tables.map((tbl) => (
                <View
                  key={tbl.name}
                  style={[
                    styles.gridItem,
                    {
                      backgroundColor: tbl.rowCount > 0 ? '#FFF7ED' : theme.colors.background,
                      borderColor: tbl.rowCount > 0 ? '#FDBA74' : theme.colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.gridItemName, { color: theme.colors.text }]}>{tbl.name}</Text>
                  <Text
                    style={[
                      styles.gridItemCount,
                      { color: tbl.rowCount > 0 ? '#C2410C' : theme.colors.textSecondary },
                    ]}
                  >
                    {tbl.rowCount}
                  </Text>
                </View>
              ))}
            </View>

            {/* Direct Confirmation UI */}
            {inlineConfirming ? (
              <View style={styles.confirmPromptBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <AlertOctagon size={24} color="#DC2626" style={{ marginRight: 8 }} />
                  <Text style={styles.confirmPromptTitle}>Are you completely sure?</Text>
                </View>
                <Text style={styles.confirmPromptText}>
                  This will immediately delete all records from every local table. Unsynced offline data cannot be recovered.
                </Text>
                <View style={styles.confirmActionRow}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: theme.colors.border }]}
                    onPress={() => setInlineConfirming(false)}
                    disabled={loading}
                  >
                    <Text style={[styles.cancelBtnText, { color: theme.colors.text }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.confirmDeleteBtn, loading && { opacity: 0.7 }]}
                    onPress={handleDeleteAllData}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    ) : (
                      <Trash2 size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                    )}
                    <Text style={styles.confirmDeleteBtnText}>
                      {loading ? 'Deleting All Records...' : 'Yes, Delete Everything Now'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.deleteButton, loading && { opacity: 0.6 }]}
                  onPress={() => setInlineConfirming(true)}
                  disabled={loading}
                >
                  <Trash2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.deleteButtonText}>Delete All Data</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.viewLayout}>
          {/* Left Table Selector Sidebar */}
          <View style={[styles.tableListSidebar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.searchBoxContainer}>
              <Search size={16} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Search tables..."
                placeholderTextColor={theme.colors.textSecondary}
                value={searchFilter}
                onChangeText={setSearchFilter}
              />
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {filteredTables.map((tbl) => {
                const isSelected = selectedTable === tbl.name;
                return (
                  <TouchableOpacity
                    key={tbl.name}
                    style={[
                      styles.tableListItem,
                      isSelected && { backgroundColor: theme.colors.primary + '18' },
                    ]}
                    onPress={() => setSelectedTable(tbl.name)}
                  >
                    <TableIcon
                      size={16}
                      color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={[
                        styles.tableListItemText,
                        { color: isSelected ? theme.colors.primary : theme.colors.text },
                        isSelected && { fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {tbl.name}
                    </Text>
                    <View
                      style={[
                        styles.countBadge,
                        {
                          backgroundColor: tbl.rowCount > 0 ? theme.colors.primary + '20' : '#E2E8F0',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.countBadgeText,
                          {
                            color: tbl.rowCount > 0 ? theme.colors.primary : '#64748B',
                          },
                        ]}
                      >
                        {tbl.rowCount}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Right Data Table View */}
          <View style={[styles.tableDataContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.tableDataHeader}>
              <View>
                <Text style={[styles.dataHeaderTitle, { color: theme.colors.text }]}>
                  Table: <Text style={{ color: theme.colors.primary }}>{selectedTable}</Text>
                </Text>
                <Text style={[styles.dataHeaderSubtitle, { color: theme.colors.textSecondary }]}>
                  Showing up to 100 recent rows
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: theme.colors.border, marginRight: 8 }]}
                  onPress={() => loadTableData(selectedTable)}
                  disabled={loadingData}
                >
                  <RefreshCw size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>Reload</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
                  onPress={() => handleClearSingleTable(selectedTable)}
                  disabled={loading}
                >
                  <Trash2 size={14} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '600' }}>Clear Table</Text>
                </TouchableOpacity>
              </View>
            </View>

            {loadingData ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={{ marginTop: 12, color: theme.colors.textSecondary }}>Loading rows...</Text>
              </View>
            ) : tableData.length > 0 ? (
              <ScrollView style={styles.tableScrollHorizontal} horizontal showsHorizontalScrollIndicator={true}>
                <ScrollView style={{ flex: 1 }}>
                  {/* Table Headers */}
                  <View style={[styles.dataRow, styles.dataRowHeader, { backgroundColor: theme.colors.background }]}>
                    {Object.keys(tableData[0]).map((col) => (
                      <Text
                        key={col}
                        style={[styles.dataCell, styles.dataCellHeader, { color: theme.colors.text }]}
                      >
                        {col}
                      </Text>
                    ))}
                  </View>

                  {/* Table Rows */}
                  {tableData.map((row, rIdx) => (
                    <View
                      key={rIdx}
                      style={[
                        styles.dataRow,
                        { borderBottomColor: theme.colors.border },
                        rIdx % 2 === 1 && { backgroundColor: theme.colors.background + '50' },
                      ]}
                    >
                      {Object.values(row).map((val: any, cIdx) => (
                        <Text
                          key={cIdx}
                          style={[styles.dataCell, { color: theme.colors.textSecondary }]}
                          numberOfLines={3}
                        >
                          {val !== null && val !== undefined ? String(val) : 'NULL'}
                        </Text>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              </ScrollView>
            ) : (
              <View style={styles.center}>
                <Database size={40} color={theme.colors.border} style={{ marginBottom: 12 }} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>
                  No records in {selectedTable}
                </Text>
                <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 }}>
                  This table is empty.
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  headerCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  tabButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  refreshIconBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  statusBannerText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  card: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dangerIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 24,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  warningText: {
    fontSize: 13,
    color: '#B45309',
    lineHeight: 18,
  },
  breakdownHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  gridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 150,
  },
  gridItemName: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  gridItemCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 10,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmPromptBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
    padding: 18,
    marginTop: 10,
  },
  confirmPromptTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
  },
  confirmPromptText: {
    fontSize: 13,
    color: '#7F1D1D',
    marginBottom: 16,
    lineHeight: 18,
  },
  confirmActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#DC2626',
  },
  confirmDeleteBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  viewLayout: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  tableListSidebar: {
    width: 260,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  searchBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  tableListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  tableListItemText: {
    flex: 1,
    fontSize: 13,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tableDataContent: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  tableDataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  dataHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  dataHeaderSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  tableScrollHorizontal: {
    flex: 1,
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  dataRowHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#CBD5E1',
  },
  dataCell: {
    width: 140,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  dataCellHeader: {
    fontWeight: '700',
    fontSize: 12,
  },
});
