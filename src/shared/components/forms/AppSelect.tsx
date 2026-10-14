import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, FlatList, Dimensions, TextInput, Platform, KeyboardAvoidingView, Pressable } from 'react-native';
import { useTheme } from '../../theme/theme';
import { ChevronDown, Check, X, Search } from 'lucide-react-native';

export interface AppSelectOption {
  label: string;
  value: any;
}

export interface AppSelectProps {
  label?: string | React.ReactNode;
  value?: any;
  placeholder?: string;
  onSelect?: (value: any) => void;
  options?: AppSelectOption[];
  error?: string;
  containerStyle?: any;
  isMulti?: boolean;
  searchable?: boolean;
  clearable?: boolean;
}

const computeDropdownLayout = (x?: number, y?: number, width?: number, height?: number) => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const measuredWidth = width && width > 0 ? width : screenWidth - 32;
  const measuredHeight = height && height > 0 ? height : 40;
  const maxDropdownHeight = 300;
  const safeY = typeof y === 'number' && !isNaN(y) && y > 0 ? y : 120;
  const safeX = typeof x === 'number' && !isNaN(x) && x > 0 ? x : 12;

  let dropWidth = Math.max(measuredWidth, 180);
  if (dropWidth > screenWidth - 24) {
    dropWidth = screenWidth - 24;
  }

  let dropLeft = safeX;
  if (dropLeft + dropWidth > screenWidth - 12) {
    dropLeft = Math.max(12, screenWidth - dropWidth - 12);
  }

  const spaceBelow = screenHeight - safeY - measuredHeight;
  const spaceAbove = safeY;

  const layout: { left: number; width: number; top?: number; bottom?: number } = {
    left: dropLeft,
    width: dropWidth,
  };

  if (spaceBelow < maxDropdownHeight && spaceAbove > spaceBelow) {
    layout.bottom = Math.max(10, screenHeight - safeY + 4);
  } else {
    layout.top = Math.max(10, safeY + measuredHeight + 4);
  }

  return layout;
};

export const AppSelect = ({ 
  label, 
  value, 
  placeholder, 
  onSelect, 
  options = [], 
  error, 
  containerStyle,
  isMulti = false,
  searchable = false,
  clearable = false
}: AppSelectProps) => {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [internalValue, setInternalValue] = useState<any>(isMulti ? (Array.isArray(value) ? value : []) : value);
  const [searchQuery, setSearchQuery] = useState('');
  const selectRef = useRef<any>(null);
  const searchInputRef = useRef<any>(null);
  const [dropdownLayout, setDropdownLayout] = useState<any>({ left: 12, top: 120, width: 200 });

  const cachedLayoutRef = useRef<{ left: number; top?: number; bottom?: number; width: number } | null>(null);
  const containerLayoutRef = useRef<{ width: number; height: number; x: number; y: number } | null>(null);

  useEffect(() => {
    setInternalValue(isMulti ? (Array.isArray(value) ? value : []) : value);
  }, [value, isMulti]);

  const handleInputLayout = (event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    containerLayoutRef.current = { x, y, width, height };
  };

  const openModal = () => {
    setSearchQuery('');
    const screenWidth = Dimensions.get('window').width;

    // 1. Web: measure synchronously using standard DOM API
    if (Platform.OS === 'web' && selectRef.current && typeof selectRef.current.getBoundingClientRect === 'function') {
      const rect = selectRef.current.getBoundingClientRect();
      const layout = computeDropdownLayout(rect.left, rect.top, rect.width, rect.height);
      setDropdownLayout(layout);
      setModalVisible(true);
      return;
    }

    // 2. Mobile: measure position if available, with immediate safe fallback
    if (selectRef.current && typeof selectRef.current.measureInWindow === 'function') {
      selectRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        if (width > 0 && height > 0) {
          const freshLayout = computeDropdownLayout(x, y, width, height);
          setDropdownLayout(freshLayout);
        } else {
          const w = containerLayoutRef.current?.width || (screenWidth - 24);
          const h = containerLayoutRef.current?.height || 40;
          setDropdownLayout(computeDropdownLayout(12, 120, w, h));
        }
      });
    } else {
      const w = containerLayoutRef.current?.width || (screenWidth - 24);
      const h = containerLayoutRef.current?.height || 40;
      setDropdownLayout(computeDropdownLayout(12, 120, w, h));
    }

    setModalVisible(true);
  };

  useEffect(() => {
    if (modalVisible && searchable) {
      const timer = setTimeout(() => {
        if (searchInputRef.current && typeof searchInputRef.current.focus === 'function') {
          searchInputRef.current.focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [modalVisible, searchable]);

  const closeModal = () => {
    setModalVisible(false);
    setSearchQuery('');
  };

  const currentValue = value !== undefined ? value : internalValue;

  const handleSelect = (item: AppSelectOption) => {
    if (isMulti) {
      const currentArray = Array.isArray(currentValue) ? currentValue : [];
      const isSelected = currentArray.includes(item.value);
      
      let newValue;
      if (isSelected) {
        newValue = currentArray.filter((v: any) => v !== item.value);
      } else {
        newValue = [...currentArray, item.value];
      }
      
      setInternalValue(newValue);
      if (onSelect) onSelect(newValue);
      
      if (searchable) {
         setSearchQuery('');
         if (searchInputRef.current && typeof searchInputRef.current.focus === 'function') {
           searchInputRef.current.focus();
         }
      }
    } else {
      setInternalValue(item.value);
      if (onSelect) onSelect(item.value);
      closeModal();
    }
  };

  const removeMultiItem = (itemValue: any) => {
    if (isMulti) {
      const currentArray = Array.isArray(currentValue) ? currentValue : [];
      const newValue = currentArray.filter((v: any) => v !== itemValue);
      setInternalValue(newValue);
      if (onSelect) onSelect(newValue);
    }
  };
  
  let displayValue = placeholder || 'Select...';
  let hasValue = false;
  
  const sanitizedOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    const seen = new Set<string>();
    return options.filter((opt) => {
      if (!opt) return false;
      const key = String(opt.value ?? '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [options]);

  if (isMulti) {
    const currentArray = Array.isArray(currentValue) ? currentValue : [];
    hasValue = currentArray.length > 0;
  } else {
    hasValue = currentValue !== undefined && currentValue !== null && currentValue !== '';
    if (hasValue) {
      const selectedOption = sanitizedOptions.find((o: AppSelectOption) => String(o.value) === String(currentValue));
      if (selectedOption) {
        displayValue = selectedOption.label;
      } else {
        displayValue = String(currentValue);
      }
    }
  }

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery) return sanitizedOptions;
    const lowerQuery = String(searchQuery).toLowerCase();
    return sanitizedOptions.filter(opt => {
      if (!opt) return false;
      return String(opt.label || '').toLowerCase().includes(lowerQuery);
    });
  }, [sanitizedOptions, searchable, searchQuery]);

  return (
    <View style={[styles.container, { marginBottom: theme.spacing.md }, containerStyle]}>
      {label && <Text style={{ color: theme.colors.text, marginBottom: theme.spacing.xs, fontWeight: theme.typography.weights.medium as any }}>{label}</Text>}
      
      <TouchableOpacity
        ref={selectRef}
        onLayout={handleInputLayout}
        delayPressIn={0}
        style={[
          styles.input, 
          { 
            backgroundColor: theme.colors.surface, 
            borderColor: error ? theme.colors.error : theme.colors.border, 
            borderRadius: theme.borderRadius.md,
            minHeight: 40,
            height: 'auto',
            paddingVertical: isMulti && hasValue ? 6 : 0,
          }
        ]}
        onPress={openModal}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          {!isMulti || !hasValue ? (
            <Text 
              style={{ color: hasValue ? theme.colors.text : theme.colors.textSecondary, fontSize: 13 }} 
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {displayValue}
            </Text>
          ) : (
            (Array.isArray(currentValue) ? currentValue : []).map((val: any, idx: number) => {
              const opt = sanitizedOptions.find(o => String(o.value) === String(val));
              const lbl = opt ? opt.label : String(val);
              return (
                <View key={`chip-${String(val)}-${idx}`} style={[styles.chip, { backgroundColor: theme.colors.background || '#f9f9f9' }]}>
                  <Text style={[styles.chipText, { color: theme.colors.text }]}>{lbl}</Text>
                  <TouchableOpacity 
                    onPress={(e) => { e.stopPropagation(); removeMultiItem(val); }} 
                    style={styles.chipRemove}
                    hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                    delayPressIn={0}
                  >
                    <X size={12} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
        <View style={{ marginLeft: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {clearable && hasValue && (
            <TouchableOpacity
              onPress={(e) => {
                e?.stopPropagation?.();
                if (isMulti) {
                  setInternalValue([]);
                  onSelect?.([]);
                } else {
                  setInternalValue('');
                  onSelect?.('');
                }
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              delayPressIn={0}
            >
              <X size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
          <ChevronDown size={16} color={theme.colors.textSecondary} />
        </View>
      </TouchableOpacity>
      
      {error && <Text style={{ color: theme.colors.error, fontSize: theme.typography.sizes.xs, marginTop: theme.spacing.xs }}>{error}</Text>}

      {/* Dropdown Modal */}
      <Modal 
        visible={modalVisible} 
        transparent 
        animationType="fade"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          {/* Overlay to catch clicks outside the modal */}
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={closeModal} 
          />
          
          <View 
            style={[styles.dropdownContainer, {
              left: dropdownLayout.left,
              width: dropdownLayout.width,
              ...(dropdownLayout.top !== undefined ? { top: dropdownLayout.top } : {}),
              ...(dropdownLayout.bottom !== undefined ? { bottom: dropdownLayout.bottom } : {}),
            }]}
            onStartShouldSetResponder={() => true}
          >
            {searchable && (
              <View style={[styles.searchContainer, { borderBottomColor: theme.colors.border || '#f0f0f0' }]}>
                <Search size={16} color={theme.colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                  ref={searchInputRef}
                  style={[styles.searchInput, { color: theme.colors.text }]}
                  placeholder="Search..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            {filteredOptions.length === 0 ? (
              <View style={styles.noOptions}>
                <Text style={{ color: theme.colors.textSecondary }}>No options found</Text>
              </View>
            ) : (
              <FlatList
                data={filteredOptions}
                keyExtractor={(item, index) => `select-opt-${String(item.value ?? '')}-${index}`}
                renderItem={({ item, index }) => {
                  let isSelected = false;
                  if (isMulti) {
                    isSelected = Array.isArray(currentValue) && currentValue.some((v: any) => String(v) === String(item.value));
                  } else {
                    isSelected = String(currentValue) === String(item.value);
                  }

                  return (
                    <TouchableOpacity 
                      key={`select-item-${String(item.value ?? '')}-${index}`}
                      style={[
                        styles.optionItem, 
                        isSelected && !isMulti && { backgroundColor: theme.colors.background || '#f9f9f9' }
                      ]} 
                      onPress={() => handleSelect(item)}
                      delayPressIn={0}
                    >
                      <Text style={[
                        styles.optionText, 
                        { color: theme.colors.text },
                        isSelected && { color: theme.colors.primary, fontWeight: '600' as any }
                      ]}>
                        {item.label}
                      </Text>
                      {isMulti && isSelected && (
                        <Check size={16} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                style={{ maxHeight: 250 }}
                bounces={false}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={5}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch' },
  input: { 
    borderWidth: 1, 
    paddingHorizontal: 10, 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  chipText: {
    fontSize: 12,
    marginRight: 4,
  },
  chipRemove: {
    padding: 2,
  },
  modalOverlay: {
    flex: 1,
  },
  dropdownContainer: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    backgroundColor: '#FAFAFA',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
  },
  optionItem: {
    padding: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
  },
  noOptions: {
    padding: 20,
    alignItems: 'center',
  }
});


