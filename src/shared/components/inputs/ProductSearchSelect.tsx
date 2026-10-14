import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Search, X, PackageCheck, AlertCircle, Edit2, Layers } from 'lucide-react-native';
import { useTheme } from '../../theme/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { useProductStore } from '../../../features/products/store/productStore';
import { Product } from '../../../features/products/types';

export interface ProductSearchSelectProps {
  label?: React.ReactNode;
  placeholder?: string;
  priceType?: 'purchase' | 'wholesale' | 'retail';
  mode?: 'search-add' | 'select'; // 'search-add' for transactions; 'select' for single product pick
  selectedProduct?: Product | null;
  selectedProductId?: string | number | null;
  onSelectProduct: (product: Product) => void;
  onClearSelection?: () => void;
  clearOnSelect?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  dropdownStyle?: StyleProp<ViewStyle>;
  debounceMs?: number;
  minSearchLength?: number;
  categoryId?: number;
  brandId?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string | null;
  required?: boolean;
}

export const ProductSearchSelect: React.FC<ProductSearchSelectProps> = ({
  label,
  placeholder = 'Search product by name, SKU or barcode...',
  priceType = 'retail',
  mode = 'search-add',
  selectedProduct: propSelectedProduct,
  selectedProductId,
  onSelectProduct,
  onClearSelection,
  clearOnSelect = mode === 'search-add',
  containerStyle,
  inputStyle,
  dropdownStyle,
  debounceMs = 350,
  minSearchLength = 1,
  categoryId,
  brandId,
  autoFocus = false,
  disabled = false,
  error,
  required = false,
}) => {
  const theme = useTheme();
  const { isMobile, isMouse } = useResponsive();
  const { fetchPaginatedProducts, fetchProductById } = useProductStore();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isChangingSelection, setIsChangingSelection] = useState(false);
  const [internalSelectedProduct, setInternalSelectedProduct] = useState<Product | null>(null);

  const inputRef = useRef<TextInput>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal product with props
  const activeProduct = propSelectedProduct || internalSelectedProduct;

  // Load product by ID if provided and not yet resolved
  useEffect(() => {
    let isCurrent = true;
    if (selectedProductId && !propSelectedProduct && (!internalSelectedProduct || String(internalSelectedProduct.id) !== String(selectedProductId))) {
      fetchProductById(selectedProductId).then((p) => {
        if (isCurrent && p) {
          setInternalSelectedProduct(p);
        }
      }).catch(() => {});
    }
    return () => {
      isCurrent = false;
    };
  }, [selectedProductId, propSelectedProduct, internalSelectedProduct, fetchProductById]);

  // Handle typing & debouncing
  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (!isOpen) setIsOpen(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(text);
    }, debounceMs);
  };

  // Perform search query when debouncedQuery changes
  useEffect(() => {
    let isCurrent = true;
    const trimmed = debouncedQuery.trim();

    if (trimmed.length < minSearchLength) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchPaginatedProducts({
      page: 1,
      limit: 15,
      search: trimmed,
      categoryId,
      brandId,
    })
      .then((res) => {
        if (isCurrent) {
          setResults(res.data || []);
        }
      })
      .catch((err) => {
        if (isCurrent) {
          console.warn('ProductSearchSelect search error:', err);
          setResults([]);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [debouncedQuery, minSearchLength, categoryId, brandId, fetchPaginatedProducts]);

  // Clear search query
  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    inputRef.current?.focus();
  };

  // Select item
  const handleItemSelect = (product: Product) => {
    onSelectProduct(product);
    if (mode === 'select') {
      setInternalSelectedProduct(product);
      setIsChangingSelection(false);
    }
    if (clearOnSelect) {
      setQuery('');
      setDebouncedQuery('');
      setResults([]);
    }
    setIsOpen(false);
  };

  // Barcode / Enter key quick selection
  const handleSubmitEditing = () => {
    if (results.length === 1) {
      handleItemSelect(results[0]);
    } else if (results.length > 1 && query.trim()) {
      const q = query.trim().toLowerCase();
      const exactMatch = results.find(
        (r) =>
          r.barcode?.toLowerCase() === q ||
          r.sku?.toLowerCase() === q ||
          r.productCode?.toLowerCase() === q ||
          r.name?.toLowerCase() === q
      );
      if (exactMatch) {
        handleItemSelect(exactMatch);
      }
    }
  };

  const getPriceDisplay = (p: Product) => {
    if (priceType === 'purchase') {
      const cost = Number(p.purchasePrice ?? p.cost ?? p.price ?? 0);
      return { label: 'Cost', value: `₹${cost.toFixed(2)}`, color: '#F97316' };
    }
    if (priceType === 'wholesale') {
      const wp = Number(p.wholesalePrice ?? (p.price ? p.price * 0.9 : 0));
      return { label: 'Wholesale', value: `₹${wp.toFixed(2)}`, color: '#10B981' };
    }
    const rp = Number(p.retailPrice ?? p.price ?? 0);
    return { label: 'Retail', value: `₹${rp.toFixed(2)}`, color: '#3B82F6' };
  };

  // In 'select' mode: if a product is selected and user is not changing it, show the summary card
  if (mode === 'select' && activeProduct && !isChangingSelection) {
    const priceInfo = getPriceDisplay(activeProduct);
    const stockQty = Number(activeProduct.stockQuantity ?? activeProduct.openingStock ?? 0);
    const unitName = activeProduct.baseUnit?.shortName || activeProduct.unit || 'Pc';

    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label && (
          <View style={styles.labelContainer}>
            {typeof label === 'string' ? (
              <Text style={[styles.labelText, { color: theme.colors.text }]}>
                {label}
                {required && <Text style={{ color: '#EF4444' }}> *</Text>}
              </Text>
            ) : (
              label
            )}
          </View>
        )}
        <View
          style={[
            styles.selectedCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: error ? '#EF4444' : theme.colors.border,
            },
          ]}
        >
          <View style={[styles.selectedIconBox, { backgroundColor: '#EFF6FF' }]}>
            <Layers size={18} color="#3B82F6" />
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.selectedTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {activeProduct.name}
            </Text>
            <View style={styles.selectedMetaRow}>
              <Text style={[styles.selectedMetaText, { color: theme.colors.textSecondary }]}>
                SKU: {activeProduct.sku || 'N/A'}
              </Text>
              <Text style={[styles.selectedMetaDot, { color: theme.colors.textSecondary }]}>•</Text>
              <Text
                style={[
                  styles.selectedMetaText,
                  { color: stockQty > 0 ? '#10B981' : '#EF4444', fontWeight: '600' },
                ]}
              >
                Stock: {Number(stockQty.toFixed(4))} {unitName}
              </Text>
              <Text style={[styles.selectedMetaDot, { color: theme.colors.textSecondary }]}>•</Text>
              <Text style={[styles.selectedMetaText, { color: priceInfo.color, fontWeight: '600' }]}>
                {priceInfo.label}: {priceInfo.value}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.changeBtn, { borderColor: theme.colors.border }]}
            onPress={() => {
              setIsChangingSelection(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            disabled={disabled}
          >
            <Edit2 size={13} color={theme.colors.primary} />
            <Text style={[styles.changeBtnText, { color: theme.colors.primary }]}>Change</Text>
          </TouchableOpacity>
          {onClearSelection && (
            <TouchableOpacity
              style={[styles.clearSelectionBtn, { borderColor: theme.colors.border }]}
              onPress={() => {
                setInternalSelectedProduct(null);
                onClearSelection();
                setIsChangingSelection(false);
              }}
              disabled={disabled}
            >
              <X size={14} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { zIndex: isOpen ? 9999 : 1 }, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          {typeof label === 'string' ? (
            <Text style={[styles.labelText, { color: theme.colors.text }]}>
              {label}
              {required && <Text style={{ color: '#EF4444' }}> *</Text>}
            </Text>
          ) : (
            label
          )}
        </View>
      )}

      {/* Search Input Box */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? '#EF4444' : isOpen ? theme.colors.primary : theme.colors.border,
            height: isMouse ? 36 : 40,
          },
          disabled && { opacity: 0.6 },
        ]}
      >
        <Search size={16} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={handleQueryChange}
          onFocus={() => {
            if (query.trim().length >= minSearchLength || results.length > 0) {
              setIsOpen(true);
            }
          }}
          onSubmitEditing={handleSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          editable={!disabled}
          autoFocus={autoFocus}
          style={[
            styles.textInput,
            { color: theme.colors.text, fontSize: isMouse ? 13 : 14 },
            inputStyle,
          ]}
        />
        {isLoading && (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: 6 }} />
        )}
        {query.length > 0 && !isLoading && (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Floating Dropdown Results */}
      {isOpen && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              top: isMouse ? 40 : 44,
            },
            dropdownStyle,
          ]}
        >
          {isLoading && results.length === 0 ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>
                Searching products...
              </Text>
            </View>
          ) : results.length > 0 ? (
            <ScrollView
              style={{ maxHeight: 260 }}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {results.map((product) => {
                const priceInfo = getPriceDisplay(product);
                const stockQty = Number(product.stockQuantity ?? product.openingStock ?? 0);
                const unitName = product.baseUnit?.shortName || product.unit || 'Pc';
                const brand = product.brandName || product.brand?.name;
                const cat = product.categoryName || product.category?.name;

                return (
                  <TouchableOpacity
                    key={product.id}
                    style={[
                      styles.resultItem,
                      { borderBottomColor: theme.colors.divider || theme.colors.border },
                    ]}
                    onPress={() => handleItemSelect(product)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text
                        style={[styles.resultName, { color: theme.colors.text }]}
                        numberOfLines={1}
                      >
                        {product.name}
                      </Text>
                      <View style={styles.resultMetaRow}>
                        <Text style={[styles.resultMeta, { color: theme.colors.textSecondary }]}>
                          SKU: {product.sku || 'N/A'}
                        </Text>
                        {(brand || cat) && (
                          <>
                            <Text style={[styles.metaDot, { color: theme.colors.textSecondary }]}>•</Text>
                            <Text style={[styles.resultMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                              {brand || cat}
                            </Text>
                          </>
                        )}
                        <Text style={[styles.metaDot, { color: theme.colors.textSecondary }]}>•</Text>
                        <Text
                          style={[
                            styles.resultMeta,
                            { color: stockQty > 0 ? '#10B981' : '#EF4444', fontWeight: '600' },
                          ]}
                        >
                          Qty: {Number(stockQty.toFixed(4))} {unitName}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.resultPriceBadge}>
                      <Text style={[styles.resultPriceText, { color: priceInfo.color }]}>
                        {priceInfo.value}
                      </Text>
                      <Text style={[styles.resultPriceSub, { color: theme.colors.textSecondary }]}>
                        {priceInfo.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : query.trim().length >= minSearchLength && !isLoading ? (
            <View style={styles.stateContainer}>
              <AlertCircle size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>
                No products found matching "{query}".
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    width: '100%',
  },
  labelContainer: {
    marginBottom: 5,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 0,
    height: '100%',
  },
  dropdown: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 6,
    zIndex: 99999,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
      },
      default: {
        elevation: 10,
      },
    }),
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  resultName: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  resultMeta: {
    fontSize: 11,
  },
  metaDot: {
    fontSize: 10,
  },
  resultPriceBadge: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 6,
  },
  resultPriceText: {
    fontSize: 13,
    fontWeight: '700',
  },
  resultPriceSub: {
    fontSize: 10,
  },
  stateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 8,
  },
  stateText: {
    fontSize: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
  },
  selectedIconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  selectedTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  selectedMetaText: {
    fontSize: 11,
  },
  selectedMetaDot: {
    fontSize: 10,
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  changeBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  clearSelectionBtn: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 5,
    marginLeft: 6,
  },
});
