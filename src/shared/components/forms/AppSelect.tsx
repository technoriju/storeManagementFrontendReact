import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, FlatList, Dimensions, TextInput, Platform, KeyboardAvoidingView, TouchableWithoutFeedback } from 'react-native';
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
}

export const AppSelect = ({ 
  label, 
  value, 
  placeholder, 
  onSelect, 
  options = [], 
  error, 
  containerStyle,
  isMulti = false,
  searchable = false
}: AppSelectProps) => {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [internalValue, setInternalValue] = useState<any>(isMulti ? (Array.isArray(value) ? value : []) : value);
  const [searchQuery, setSearchQuery] = useState('');
  const selectRef = useRef<any>(null);
  const searchInputRef = useRef<any>(null);
  const [dropdownLayout, setDropdownLayout] = useState<any>({ left: 0, top: 0, width: 0 });

  const openModal = () => {
    setSearchQuery('');
    if (selectRef.current && typeof selectRef.current.measureInWindow === 'function') {
      selectRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        const screenHeight = Dimensions.get('window').height;
        const spaceBelow = screenHeight - y - height;
        const maxDropdownHeight = 300;
        
        const layout: any = { left: x, width };
        if (spaceBelow < maxDropdownHeight && y > spaceBelow) {
          layout.bottom = screenHeight - y + 4;
        } else {
          layout.top = y + height + 4;
        }

        setDropdownLayout(layout);
        setModalVisible(true);
      });
    } else {
      setModalVisible(true);
    }
  };

  useEffect(() => {
    if (modalVisible && searchable) {
      // Delay ensures the native Modal is fully mounted before requesting keyboard focus
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
  
  if (isMulti) {
    const currentArray = Array.isArray(currentValue) ? currentValue : [];
    hasValue = currentArray.length > 0;
  } else {
    hasValue = currentValue !== undefined && currentValue !== null && currentValue !== '';
    if (hasValue) {
      const selectedOption = options.find((o: AppSelectOption) => o.value === currentValue);
      if (selectedOption) {
        displayValue = selectedOption.label;
      } else {
        displayValue = String(currentValue);
      }
    }
  }

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery) return options;
    const lowerQuery = String(searchQuery).toLowerCase();
    return options.filter(opt => {
      if (!opt) return false;
      return String(opt.label || '').toLowerCase().includes(lowerQuery);
    });
  }, [options, searchable, searchQuery]);

  return (
    <View style={[styles.container, { marginBottom: theme.spacing.md }, containerStyle]}>
      {label && <Text style={{ color: theme.colors.text, marginBottom: theme.spacing.xs, fontWeight: theme.typography.weights.medium as any }}>{label}</Text>}
      
      <TouchableOpacity
        ref={selectRef}
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
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {!isMulti || !hasValue ? (
            <Text style={{ color: hasValue ? theme.colors.text : theme.colors.textSecondary }}>
              {displayValue}
            </Text>
          ) : (
            (Array.isArray(currentValue) ? currentValue : []).map((val: any) => {
              const opt = options.find(o => o.value === val);
              const lbl = opt ? opt.label : String(val);
              return (
                <View key={String(val)} style={[styles.chip, { backgroundColor: theme.colors.background || '#f9f9f9' }]}>
                  <Text style={[styles.chipText, { color: theme.colors.text }]}>{lbl}</Text>
                  <TouchableOpacity 
                    onPress={(e) => { e.stopPropagation(); removeMultiItem(val); }} 
                    style={styles.chipRemove}
                    hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                  >
                    <X size={12} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
        <View style={{ marginLeft: 8 }}>
          <ChevronDown size={16} color={theme.colors.textSecondary} />
        </View>
      </TouchableOpacity>
      
      {error && <Text style={{ color: theme.colors.error, fontSize: theme.typography.sizes.xs, marginTop: theme.spacing.xs }}>{error}</Text>}

      {/* Dropdown Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
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
          
          <TouchableWithoutFeedback>
            <View 
              style={[styles.dropdownContainer, {
                left: dropdownLayout.left,
                width: dropdownLayout.width,
                ...(dropdownLayout.top ? { top: dropdownLayout.top } : {}),
                ...(dropdownLayout.bottom ? { bottom: dropdownLayout.bottom } : {}),
              }]}
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
                keyExtractor={(item, index) => String(item.value) + index}
                renderItem={({ item }) => {
                  let isSelected = false;
                  if (isMulti) {
                    isSelected = Array.isArray(currentValue) && currentValue.includes(item.value);
                  } else {
                    isSelected = currentValue === item.value;
                  }

                  return (
                    <TouchableOpacity 
                      style={[
                        styles.optionItem, 
                        isSelected && !isMulti && { backgroundColor: theme.colors.background || '#f9f9f9' }
                      ]} 
                      onPress={() => handleSelect(item)}
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
                  )
                }}
                style={{ maxHeight: 250 }}
                bounces={false}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  input: { 
    borderWidth: 1, 
    paddingHorizontal: 16, 
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


