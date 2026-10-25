import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  Pressable, 
  Platform, 
  Animated, 
  ActivityIndicator, 
  NativeSyntheticEvent, 
  NativeScrollEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { Search, ChevronLeft, ChevronRight, ChevronDown, LayoutGrid, Table as TableIcon } from 'lucide-react-native';

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
  searchValue?: string;
  debounceSearchMs?: number;
  filters?: React.ReactNode;
  renderRowActions?: (item: T) => React.ReactNode;
  hasCheckbox?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  page?: number;
  rowsPerPage?: number;
  totalItems?: number;
  totalPages?: number;
  onPageChange?: (newPage: number) => void;
  onRowsPerPageChange?: (newRowsPerPage: number) => void;
  renderMobileCard?: (item: T, index: number) => React.ReactNode;
  viewMode?: 'table' | 'card';
  onViewModeChange?: (mode: 'table' | 'card') => void;
  paginationMode?: 'scroll' | 'pagination';
  batchSize?: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const SkeletonItem = ({ 
  style, 
  theme 
}: { 
  style?: StyleProp<ViewStyle>; 
  theme: any;
}) => {
  const opacityAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: theme.isDark ? '#374151' : '#E2E8F0',
          opacity: opacityAnim,
          borderRadius: 4,
        },
        style,
      ]}
    />
  );
};

const TableSkeleton = ({
  columns,
  hasCheckbox,
  renderRowActions,
  theme,
  rowCount = 8,
}: {
  columns: AdvancedTableColumn<any>[];
  hasCheckbox?: boolean;
  renderRowActions?: (item: any) => React.ReactNode;
  theme: any;
  rowCount?: number;
}) => {
  const widths = [65, 80, 50, 70, 60, 75, 55, 85];
  return (
    <View>
      {Array.from({ length: rowCount }).map((_, rIdx) => (
        <View
          key={`skel-row-${rIdx}`}
          style={[
            styles.row,
            { borderBottomColor: theme.colors.divider },
            rIdx === rowCount - 1 && { borderBottomWidth: 0 },
          ]}
        >
          {hasCheckbox && (
            <View style={styles.checkboxCell}>
              <SkeletonItem style={{ width: 18, height: 18, borderRadius: 4 }} theme={theme} />
            </View>
          )}
          {columns.map((col, cIdx) => {
            const w = widths[(rIdx + cIdx) % widths.length];
            return (
              <View
                key={col.key || cIdx.toString()}
                style={[
                  styles.cell,
                  col.width ? { width: col.width } : { flex: col.flex || 1 },
                  col.minWidth ? { minWidth: col.minWidth } : null,
                ]}
              >
                <SkeletonItem
                  style={{
                    height: 14,
                    width: `${w}%`,
                    maxWidth: 160,
                  }}
                  theme={theme}
                />
              </View>
            );
          })}
          {renderRowActions && (
            <View
              style={[
                styles.cell,
                { width: 140, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingRight: 24 },
              ]}
            >
              <SkeletonItem style={{ width: 28, height: 28, borderRadius: 6 }} theme={theme} />
              <SkeletonItem style={{ width: 28, height: 28, borderRadius: 6 }} theme={theme} />
              <SkeletonItem style={{ width: 28, height: 28, borderRadius: 6 }} theme={theme} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

const CardSkeleton = ({
  theme,
  count = 5,
}: {
  theme: any;
  count?: number;
}) => {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, idx) => (
        <View
          key={`skel-card-${idx}`}
          style={[
            styles.skeletonCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <SkeletonItem style={{ height: 16, width: '45%' }} theme={theme} />
            <SkeletonItem style={{ height: 20, width: 60, borderRadius: 10 }} theme={theme} />
          </View>
          <View style={{ gap: 6, marginBottom: 12 }}>
            <SkeletonItem style={{ height: 12, width: '70%' }} theme={theme} />
            <SkeletonItem style={{ height: 12, width: '55%' }} theme={theme} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.divider }}>
            <SkeletonItem style={{ height: 18, width: 80 }} theme={theme} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SkeletonItem style={{ width: 30, height: 30, borderRadius: 6 }} theme={theme} />
              <SkeletonItem style={{ width: 30, height: 30, borderRadius: 6 }} theme={theme} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

export const AdvancedTable = <T extends Record<string, any>>({
  title,
  subtitle,
  headerActions,
  columns,
  data,
  searchPlaceholder = 'Search',
  onSearch,
  searchValue,
  debounceSearchMs,
  filters,
  renderRowActions,
  hasCheckbox = true,
  isLoading = false,
  isLoadingMore: controlledIsLoadingMore,
  page: controlledPage,
  rowsPerPage: controlledRowsPerPage,
  totalItems: controlledTotalItems,
  totalPages: controlledTotalPages,
  onPageChange,
  onRowsPerPageChange,
  renderMobileCard,
  viewMode: controlledViewMode,
  onViewModeChange,
  paginationMode = 'scroll',
  batchSize = 20,
  onLoadMore,
  hasMore: controlledHasMore,
}: AdvancedTableProps<T>) => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();
  const isServerSide = controlledTotalItems !== undefined || controlledTotalPages !== undefined;

  const [internalPage, setInternalPage] = useState(1);
  const [internalRowsPerPage, setInternalRowsPerPage] = useState(10);
  const [showDropdown, setShowDropdown] = useState(false);
  const [internalViewMode, setInternalViewMode] = useState<'table' | 'card'>(isMobile && renderMobileCard ? 'card' : 'table');

  // Client-side batch loading count
  const [visibleCount, setVisibleCount] = useState(batchSize);

  // Server-side accumulated data when scrolling in page mode
  const [accumulatedData, setAccumulatedData] = useState<T[]>([]);

  const isFetchingRef = useRef(false);

  const currentViewMode = controlledViewMode ?? internalViewMode;

  const toggleViewMode = () => {
    const nextMode = currentViewMode === 'table' ? 'card' : 'table';
    if (onViewModeChange) {
      onViewModeChange(nextMode);
    } else {
      setInternalViewMode(nextMode);
    }
  };

  const page = isServerSide && controlledPage !== undefined ? controlledPage : internalPage;
  const rowsPerPage = isServerSide && controlledRowsPerPage !== undefined ? controlledRowsPerPage : internalRowsPerPage;

  const tableData = Array.isArray(data) ? data : [];

  // Reset client visible count or server accumulation on search or total length change
  useEffect(() => {
    setVisibleCount(batchSize);
  }, [tableData.length, searchValue, batchSize]);

  useEffect(() => {
    if (paginationMode === 'scroll' && isServerSide) {
      const currentPageNum = controlledPage ?? 1;
      if (currentPageNum <= 1) {
        setAccumulatedData(tableData);
      } else {
        setAccumulatedData(prev => {
          const seen = new Set(prev.map(i => i.id ?? JSON.stringify(i)));
          const nextItems = tableData.filter(i => !seen.has(i.id ?? JSON.stringify(i)));
          return [...prev, ...nextItems];
        });
      }
    }
  }, [tableData, controlledPage, paginationMode, isServerSide]);

  // Determine current items to display
  let currentData: T[];
  let totalItems: number;
  let totalPages: number;
  let hasMore: boolean;

  if (paginationMode === 'scroll') {
    if (isServerSide) {
      currentData = accumulatedData.length > 0 ? accumulatedData : tableData;
      totalItems = controlledTotalItems ?? currentData.length;
      totalPages = controlledTotalPages ?? Math.max(1, Math.ceil(totalItems / (controlledRowsPerPage || batchSize)));
      hasMore = controlledHasMore !== undefined 
        ? controlledHasMore 
        : (controlledPage !== undefined ? controlledPage < totalPages : currentData.length < totalItems);
    } else {
      totalItems = tableData.length;
      totalPages = Math.max(1, Math.ceil(totalItems / batchSize));
      currentData = tableData.slice(0, visibleCount);
      hasMore = controlledHasMore !== undefined ? controlledHasMore : visibleCount < totalItems;
    }
  } else {
    totalItems = isServerSide && controlledTotalItems !== undefined ? controlledTotalItems : tableData.length;
    totalPages = isServerSide && controlledTotalPages !== undefined 
      ? Math.max(1, controlledTotalPages) 
      : Math.max(1, Math.ceil(totalItems / rowsPerPage));
    currentData = isServerSide ? tableData : tableData.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    hasMore = page < totalPages;
  }

  // Keep page valid when data changes in client-side pagination mode
  useEffect(() => {
    if (!isServerSide && paginationMode === 'pagination') {
      const nextPage = Math.max(1, Math.ceil(totalItems / rowsPerPage));
      setInternalPage(currentPage => Math.min(currentPage, nextPage));
    }
  }, [isServerSide, totalItems, rowsPerPage, paginationMode]);

  const handlePageChange = (newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
    }
    if (!isServerSide || controlledPage === undefined) {
      setInternalPage(newPage);
    }
  };

  const handleRowsPerPageChange = (newRows: number) => {
    if (onRowsPerPageChange) {
      onRowsPerPageChange(newRows);
    }
    if (!isServerSide || controlledRowsPerPage === undefined) {
      setInternalRowsPerPage(newRows);
      setInternalPage(1);
    }
  };

  // Scroll load more handler
  const handleLoadMore = useCallback(() => {
    if (isFetchingRef.current || !hasMore || isLoading || controlledIsLoadingMore) {
      return;
    }
    isFetchingRef.current = true;

    if (isServerSide) {
      if (onLoadMore) {
        onLoadMore();
      } else if (onPageChange && controlledPage !== undefined && controlledPage < totalPages) {
        onPageChange(controlledPage + 1);
      }
    } else {
      setVisibleCount(prev => Math.min(prev + batchSize, totalItems));
    }

    setTimeout(() => {
      isFetchingRef.current = false;
    }, 350);
  }, [hasMore, isLoading, controlledIsLoadingMore, isServerSide, onLoadMore, onPageChange, controlledPage, totalPages, batchSize, totalItems]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (paginationMode !== 'scroll') return;
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 120;
    if (isCloseToBottom) {
      handleLoadMore();
    }
  };

  // Search state and debouncing
  const [localSearch, setLocalSearch] = useState(searchValue ?? '');

  useEffect(() => {
    if (searchValue !== undefined && searchValue !== localSearch) {
      setLocalSearch(searchValue);
    }
  }, [searchValue]);

  useEffect(() => {
    if (debounceSearchMs && debounceSearchMs > 0) {
      const handler = setTimeout(() => {
        onSearch?.(localSearch);
      }, debounceSearchMs);
      return () => clearTimeout(handler);
    }
  }, [localSearch, debounceSearchMs]);

  const handleSearchChange = (text: string) => {
    setLocalSearch(text);
    if (!debounceSearchMs || debounceSearchMs <= 0) {
      onSearch?.(text);
    }
  };

  const baseOptions = [10, 20, 50, 100];
  const uniquePageOptions = isServerSide
    ? baseOptions
    : Array.from(new Set(baseOptions.filter(value => value > 0 && value <= totalItems).concat(totalItems <= 100 ? [totalItems] : [10]))).sort((a, b) => a - b);
  if (uniquePageOptions.length === 0 || !uniquePageOptions.includes(10)) {
    uniquePageOptions.unshift(10);
  }

  const isLoadingMore = controlledIsLoadingMore || (isFetchingRef.current && isLoading);

  return (
    <View style={styles.container}>
      {/* Page Header */}
      {(title || headerActions) && (
        <View style={[styles.pageHeader, isMobile ? styles.pageHeaderMobile : styles.pageHeaderDesktop]}>
          <View style={[styles.titleWrapper, isMobile && styles.titleWrapperMobile]}>
            {title && (
              <Text 
                style={[
                  styles.pageTitle, 
                  !isMobile && styles.pageTitleDesktop,
                  isMobile && styles.pageTitleMobile,
                  isMobile && windowWidth < 360 && { fontSize: 14 },
                  { color: theme.colors.text }
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
            )}
            {subtitle && (
              <Text style={[styles.pageSubtitle, { color: theme.colors.textSecondary }]}>
                {subtitle}
              </Text>
            )}
          </View>
          <View style={[styles.pageActions, isMobile && styles.pageActionsMobile]}>
            {headerActions}
          </View>
        </View>
      )}

      {/* Table Card */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        
        {/* Table Toolbar (Search & Filters & Switcher) */}
        {!isMobile ? (
          <View style={[styles.toolbarDesktop, { borderBottomColor: theme.colors.divider }]}>
            <View style={[styles.searchContainerDesktop, { borderColor: theme.colors.border }]}>
              <Search size={18} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder={searchPlaceholder}
                placeholderTextColor={theme.colors.textSecondary}
                value={localSearch}
                onChangeText={handleSearchChange}
              />
            </View>

            <View style={styles.toolbarRightDesktop}>
              {filters}
              {renderMobileCard && (
                <Pressable
                  style={[styles.viewToggleBtn, { borderColor: theme.colors.border }]}
                  onPress={toggleViewMode}
                >
                  {currentViewMode === 'card' ? (
                    <TableIcon size={18} color={theme.colors.textSecondary} />
                  ) : (
                    <LayoutGrid size={18} color={theme.colors.textSecondary} />
                  )}
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          <View style={[styles.toolbarMobile, { borderBottomColor: theme.colors.divider }]}>
            <View style={styles.toolbarMobileRow1}>
              <View style={[styles.searchContainerMobile, { borderColor: theme.colors.border }]}>
                <Search size={18} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.text }]}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={theme.colors.textSecondary}
                  value={localSearch}
                  onChangeText={handleSearchChange}
                />
              </View>
              {renderMobileCard && (
                <Pressable
                  style={[styles.viewToggleBtn, { borderColor: theme.colors.border }]}
                  onPress={toggleViewMode}
                >
                  {currentViewMode === 'card' ? (
                    <TableIcon size={18} color={theme.colors.textSecondary} />
                  ) : (
                    <LayoutGrid size={18} color={theme.colors.textSecondary} />
                  )}
                </Pressable>
              )}
            </View>

            {filters && (
              <View style={styles.toolbarMobileRow2}>
                {filters}
              </View>
            )}
          </View>
        )}

        {/* Content: Mobile Cards or Table */}
        {currentViewMode === 'card' && renderMobileCard ? (
          <ScrollView 
            style={styles.cardListScroll} 
            contentContainerStyle={{ padding: 12 }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {isLoading && currentData.length === 0 ? (
              <CardSkeleton theme={theme} count={5} />
            ) : currentData.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ color: theme.colors.textSecondary }}>No data found</Text>
              </View>
            ) : (
              <>
                {currentData.map((item, rowIndex) => (
                  <View key={`card-row-${item.id ?? ''}-${rowIndex}`} style={{ marginBottom: 12 }}>
                    {renderMobileCard(item, rowIndex)}
                  </View>
                ))}
                {isLoadingMore && (
                  <View style={{ marginTop: 8 }}>
                    <CardSkeleton theme={theme} count={1} />
                  </View>
                )}
              </>
            )}
          </ScrollView>
        ) : (
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
              <ScrollView 
                style={{ flex: 1 }}
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {isLoading && currentData.length === 0 ? (
                  <TableSkeleton 
                    columns={columns} 
                    hasCheckbox={hasCheckbox} 
                    renderRowActions={renderRowActions} 
                    theme={theme} 
                    rowCount={8} 
                  />
                ) : currentData.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={{ color: theme.colors.textSecondary }}>No data found</Text>
                  </View>
                ) : (
                  <>
                    {currentData.map((item, rowIndex) => (
                      <View 
                        key={`row-${item.id ?? ''}-${rowIndex}`} 
                        style={[
                          styles.row, 
                          { borderBottomColor: theme.colors.divider },
                          rowIndex === currentData.length - 1 && !isLoadingMore && { borderBottomWidth: 0 }
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
                    ))}
                    {isLoadingMore && (
                      <TableSkeleton 
                        columns={columns} 
                        hasCheckbox={hasCheckbox} 
                        renderRowActions={renderRowActions} 
                        theme={theme} 
                        rowCount={2} 
                      />
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          </ScrollView>
        )}

        {/* Footer */}
        {paginationMode === 'scroll' ? (
          <View style={[styles.footer, { borderTopColor: theme.colors.divider }]}>
            <View style={styles.scrollFooterLeft}>
              <Text style={[styles.scrollFooterText, { color: theme.colors.textSecondary }]}>
                Showing <Text style={{ fontWeight: '700', color: theme.colors.text }}>{currentData.length}</Text> of{' '}
                <Text style={{ fontWeight: '700', color: theme.colors.text }}>{totalItems}</Text> items
              </Text>
            </View>
            
            <View style={styles.scrollFooterRight}>
              {isLoadingMore ? (
                <View style={styles.loadingMoreWrapper}>
                  <ActivityIndicator size="small" color="#F97316" />
                  <Text style={[styles.loadingMoreText, { color: theme.colors.textSecondary }]}>Loading more...</Text>
                </View>
              ) : hasMore ? (
                <Pressable 
                  style={[styles.loadMoreBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                  onPress={handleLoadMore}
                >
                  <Text style={[styles.loadMoreBtnText, { color: theme.colors.textSecondary }]}>Load more</Text>
                </Pressable>
              ) : totalItems > 0 ? (
                <Text style={[styles.allLoadedText, { color: theme.colors.textSecondary }]}>All loaded</Text>
              ) : null}
            </View>
          </View>
        ) : (
          /* Traditional Page-number Pagination */
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
                          handleRowsPerPageChange(val);
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
                onPress={() => handlePageChange(Math.max(1, page - 1))}
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
                      onPress={() => handlePageChange(pageNum)}
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
                onPress={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages || totalPages === 0}
              >
                <ChevronRight size={16} color={page === totalPages || totalPages === 0 ? theme.colors.textDisabled : theme.colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageHeader: {
    marginBottom: 16,
  },
  pageHeaderDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  pageHeaderMobile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 6,
    marginBottom: 10,
  },
  titleWrapper: {
    flexDirection: 'column',
  },
  titleWrapperMobile: {
    flexShrink: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  pageTitleMobile: {
    fontSize: 15,
  },
  pageTitleDesktop: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pageSubtitle: {
    fontSize: 13,
    marginTop: 3,
  },
  pageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  pageActionsMobile: {
    flexShrink: 0,
    flexWrap: 'nowrap',
    gap: 6,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
  },
  toolbarDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexWrap: 'wrap',
    gap: 10,
  },
  searchContainerDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 40,
    flex: 1,
    maxWidth: 280,
    minWidth: 140,
  },
  toolbarRightDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  toolbarMobile: {
    flexDirection: 'column',
    padding: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  toolbarMobileRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  searchContainerMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 40,
    flex: 1,
  },
  toolbarMobileRow2: {
    width: '100%',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    height: '100%',
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  viewToggleBtn: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  cardListScroll: {
    flex: 1,
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
  skeletonCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
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
  scrollFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollFooterText: {
    fontSize: 13,
  },
  scrollFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingMoreWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loadingMoreText: {
    fontSize: 13,
  },
  loadMoreBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  loadMoreBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  allLoadedText: {
    fontSize: 12,
    fontStyle: 'italic',
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
