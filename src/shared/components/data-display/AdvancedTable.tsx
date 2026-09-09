import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Platform } from 'react-native';
import { useTheme } from '../../theme/theme';
import { Search, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react-native';

export interface AdvancedTableColumn<T> {
  key: string;
  title: string;
  width?: number;
  minWidth?: number;
  flex?: number;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface AdvancedTableProps<T> {
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  columns: AdvancedTableColumn<T>[];
  data: T[];
  searchPlaceholder?: string;
  onSearch?: (text: string) => void;
  filters?: React.ReactNode;
  renderRowActions?: (item: T) => React.ReactNode;
  hasCheckbox?: boolean;
  isLoading?: boolean;
}

export const AdvancedTable = <T extends Record<string, any>>({
  title,
  subtitle,
  headerActions,
  columns,
  data,
  searchPlaceholder = 'Search',
  onSearch,
  filters,
  renderRowActions,
  hasCheckbox = true,
  isLoading = false,
}: AdvancedTableProps<T>) => {
  const theme = useTheme();
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  
  const totalPages = Math.ceil((data?.length || 0) / rowsPerPage);
  const currentData = data?.slice((page - 1) * rowsPerPage, page * rowsPerPage) || [];

  return (
    <View style={styles.container}>
      {/* Page Header */}
      {(title || headerActions) && (
        <View style={styles.pageHeader}>
          <View>
            {title && <Text style={[styles.pageTitle, { color: theme.colors.text }]}>{title}</Text>}
            {subtitle && <Text style={[styles.pageSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>}
          </View>
          <View style={styles.pageActions}>
            {headerActions}
          </View>
        </View>
      )}

      {/* Table Card */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        
        {/* Table Toolbar (Search & Filters) */}
        <View style={[styles.toolbar, { borderBottomColor: theme.colors.divider }]}>
          <View style={[styles.searchContainer, { borderColor: theme.colors.border }]}>
            <Search size={18} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder={searchPlaceholder}
              placeholderTextColor={theme.colors.textSecondary}
              onChangeText={onSearch}
            />
          </View>
          <View style={styles.filtersContainer}>
            {filters}
          </View>
        </View>

        {/* Table Content */}
        <ScrollView horizontal style={styles.tableScroll} contentContainerStyle={{ minWidth: '100%' }}>
          <View style={{ minWidth: '100%', flex: 1 }}>
            {/* Header Row */}
            <View style={[styles.headerRow, { borderBottomColor: theme.colors.divider }]}>
              {hasCheckbox && (
                <View style={styles.checkboxCell}>
                  <View style={[styles.checkbox, { borderColor: theme.colors.border }]} />
                </View>
              )}
              {columns.map((col, index) => (
                <View 
                  key={col.key || index.toString()} 
                  style={[styles.cell, col.width ? { width: col.width } : { flex: col.flex || 1 }, col.minWidth ? { minWidth: col.minWidth } : null]}
                >
                  <Text style={[styles.headerText, { color: theme.colors.textSecondary }]}>{col.title}</Text>
                </View>
              ))}
              {renderRowActions && (
                <View style={[styles.cell, { width: 140, paddingRight: 24 }]} />
              )}
            </View>

            {/* Body Rows */}
            {isLoading ? (
              <View style={styles.emptyState}>
                <Text style={{ color: theme.colors.textSecondary }}>Loading data...</Text>
              </View>
            ) : currentData.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ color: theme.colors.textSecondary }}>No data found</Text>
              </View>
            ) : (
              currentData.map((item, rowIndex) => (
                <View 
                  key={item.id || rowIndex.toString()} 
                  style={[
                    styles.row, 
                    { borderBottomColor: theme.colors.divider },
                    rowIndex === currentData.length - 1 && { borderBottomWidth: 0 }
                  ]}
                >
                  {hasCheckbox && (
                    <View style={styles.checkboxCell}>
                      <View style={[styles.checkbox, { borderColor: theme.colors.border }]} />
                    </View>
                  )}
                  {columns.map((col, colIndex) => (
                    <View 
                      key={col.key || colIndex.toString()} 
                      style={[styles.cell, col.width ? { width: col.width } : { flex: col.flex || 1 }, col.minWidth ? { minWidth: col.minWidth } : null]}
                    >
                      {col.render ? (
                        col.render(item[col.key], item)
                      ) : (
                        <Text style={[styles.cellText, { color: theme.colors.textSecondary }]}>
                          {item[col.key]}
                        </Text>
                      )}
                    </View>
                  ))}
                  {renderRowActions && (
                    <View style={[styles.cell, { width: 140, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingRight: 24 }]}>
                      {renderRowActions(item)}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Footer / Pagination */}
        <View style={[styles.footer, { borderTopColor: theme.colors.divider }]}>
          <View style={styles.rowsPerPage}>
            <Text style={{ color: theme.colors.textSecondary }}>Row Per Page</Text>
            <View style={[styles.rowsDropdown, { borderColor: theme.colors.border }]}>
              <Text style={{ color: theme.colors.textSecondary }}>{rowsPerPage}</Text>
              <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
            </View>
            <Text style={{ color: theme.colors.textSecondary }}>Entries</Text>
          </View>
          
          <View style={styles.pagination}>
            <Pressable 
              style={[styles.pageButton, { backgroundColor: theme.colors.background }]}
              onPress={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={16} color={page === 1 ? theme.colors.textDisabled : theme.colors.textSecondary} />
            </Pressable>
            
            {Array.from({ length: totalPages || 1 }).map((_, i) => {
              const p = i + 1;
              const isActive = p === page;
              return (
                <Pressable 
                  key={p} 
                  style={[
                    styles.pageButton, 
                    isActive ? { backgroundColor: '#F97316' } : { backgroundColor: theme.colors.background }
                  ]}
                  onPress={() => setPage(p)}
                >
                  <Text style={[styles.pageText, { color: isActive ? '#FFFFFF' : theme.colors.textSecondary }]}>
                    {p}
                  </Text>
                </Pressable>
              );
            })}
            
            <Pressable 
              style={[styles.pageButton, { backgroundColor: theme.colors.background }]}
              onPress={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || totalPages === 0}
            >
              <ChevronRight size={16} color={page === totalPages || totalPages === 0 ? theme.colors.textDisabled : theme.colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
  },
  pageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    flexWrap: 'wrap',
    gap: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 40,
    minWidth: 250,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    height: '100%',
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  tableScroll: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cell: {
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  checkboxCell: {
    width: 48,
    paddingLeft: 16,
    justifyContent: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderRadius: 4,
  },
  headerText: {
    fontWeight: '600',
    fontSize: 14,
  },
  cellText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    flexWrap: 'wrap',
    gap: 16,
  },
  rowsPerPage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowsDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pagination: {
    flexDirection: 'row',
    gap: 4,
  },
  pageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageText: {
    fontWeight: '500',
    fontSize: 14,
  },
});
