import React, { useEffect, useState } from 'react';
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
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showDropdown, setShowDropdown] = useState(false);
  const tableData = Array.isArray(data) ? data : [];
  const totalItems = tableData.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);

  // Keep page valid when data changes, such as after search, delete, or refresh.
  useEffect(() => {
    const nextPage = Math.max(1, Math.ceil(totalItems / rowsPerPage));
    setPage(currentPage => Math.min(currentPage, nextPage));
  }, [totalItems, rowsPerPage]);

  const currentData = tableData.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const pageOptions = Array.from(new Set([10, 20, 50, 100].filter(value => value > 0 && value <= totalItems).concat(totalItems <= 100 ? [totalItems] : []))).sort((a, b) => a - b);
  // Ensure we always have at least 10 in options even if totalItems is small
  if (pageOptions.length === 0 || !pageOptions.includes(10)) {
    pageOptions.unshift(10);
  }
  const uniquePageOptions = Array.from(new Set(pageOptions)).sort((a, b) => a - b);

  return (
    <View style={styles.container}>
      {/* Page Header */}
      {(title || headerActions) && (
        <View style={styles.pageHeader}>
          <View>
            {title && <Text style={[styles.pageTitle, { color: theme.colors.text }]}>{title}</Text>}
            {/* {subtitle && <Text style={[styles.pageSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>} */}
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
        <ScrollView horizontal style={styles.tableScroll} contentContainerStyle={{ minWidth: '100%', flexGrow: 1 }}>
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
            <ScrollView style={{ flex: 1 }}>
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
            </ScrollView>
          </View>
        </ScrollView>

        {/* Footer / Pagination */}
        <View style={[styles.footer, { borderTopColor: theme.colors.divider }]}>
          <View style={styles.rowsPerPage}>
            <Text style={{ color: theme.colors.textSecondary }}>Rows per page:</Text>
            <View style={{ position: 'relative', zIndex: 50, elevation: 5 }}>
              <Pressable 
                style={[styles.rowsDropdown, { borderColor: theme.colors.border }]}
                onPress={() => setShowDropdown(!showDropdown)}
              >
                <Text style={{ color: theme.colors.textSecondary }}>{rowsPerPage}</Text>
                <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
              </Pressable>
              {showDropdown && (
                <View style={[styles.dropdownMenu, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  {uniquePageOptions.map(val => (
                    <Pressable 
                      key={val} 
                      style={styles.dropdownItem}
                      onPress={() => {
                        setRowsPerPage(val);
                        setPage(1);
                        setShowDropdown(false);
                      }}
                    >
                      <Text style={{ color: theme.colors.text, fontWeight: rowsPerPage === val ? 'bold' : 'normal' }}>{val}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
            <Text style={{ color: theme.colors.textSecondary }}>
              {totalItems > 0 ? `${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, totalItems)} of ${totalItems}` : '0 of 0'}
            </Text>
          </View>
          
          <View style={styles.pagination}>
            <Pressable 
              style={[styles.pageButton, { backgroundColor: theme.colors.background }]}
              onPress={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={16} color={page === 1 ? theme.colors.textDisabled : theme.colors.textSecondary} />
            </Pressable>
            
            {(() => {
              let visiblePages: (number | string)[] = [];
              if (totalPages <= 5) {
                visiblePages = Array.from({ length: totalPages }).map((_, i) => i + 1);
              } else if (page <= 3) {
                visiblePages = [1, 2, 3, 4, '...', totalPages];
              } else if (page >= totalPages - 2) {
                visiblePages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
              } else {
                visiblePages = [1, '...', page - 1, page, page + 1, '...', totalPages];
              }

              return visiblePages.map((p, i) => {
                if (p === '...') {
                  return (
                    <View key={`ellipsis-${i}`} style={[styles.pageButton, { backgroundColor: 'transparent' }]}>
                      <Text style={{ color: theme.colors.textSecondary }}>...</Text>
                    </View>
                  );
                }
                const pageNum = p as number;
                const isActive = pageNum === page;
                return (
                  <Pressable 
                    key={pageNum} 
                    style={[
                      styles.pageButton, 
                      isActive ? { backgroundColor: '#F97316' } : { backgroundColor: theme.colors.background }
                    ]}
                    onPress={() => setPage(pageNum)}
                  >
                    <Text style={[styles.pageText, { color: isActive ? '#FFFFFF' : theme.colors.textSecondary }]}>
                      {pageNum}
                    </Text>
                  </Pressable>
                );
              });
            })()}
            
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
    fontSize: 18,
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
  dropdownMenu: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 4,
    marginBottom: 4,
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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


