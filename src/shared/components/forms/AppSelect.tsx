import React, { useState, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, FlatList, TouchableWithoutFeedback, Dimensions, Platform } from 'react-native';
import { useTheme } from '../../theme/theme';
import { ChevronDown } from 'lucide-react-native';

export interface AppSelectOption {
  label: string;
  value: any;
}

export const AppSelect = ({ label, value, placeholder, onSelect, options = [], error, containerStyle }: any) => {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const selectRef = useRef<any>(null);
  const [dropdownLayout, setDropdownLayout] = useState<any>({ left: 0, width: 0 });

  const openModal = () => {
    selectRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      const screenHeight = Dimensions.get('window').height;
      const spaceBelow = screenHeight - y - height;
      const maxDropdownHeight = 250;

      const layout: any = { left: x, width };

      // If there's not enough space below, and there's more space above, open upwards
      if (spaceBelow < maxDropdownHeight && y > spaceBelow) {
        layout.bottom = screenHeight - y + 4;
      } else {
        layout.top = y + height + 4;
      }

      setDropdownLayout(layout);
      setModalVisible(true);
    });
  };

  const handleSelect = (item: AppSelectOption) => {
    setInternalValue(item.value);
    if (onSelect) onSelect(item.value);
    setModalVisible(false);
  };

  const currentValue = value !== undefined ? value : internalValue;
  const selectedOption = options.find((o: AppSelectOption) => o.value === currentValue);
  
  let displayValue = placeholder || 'Select...';
  if (selectedOption) {
    displayValue = selectedOption.label;
  } else if (currentValue) {
    displayValue = String(currentValue);
  }

  const hasValue = currentValue !== undefined && currentValue !== null && currentValue !== '';

  return (
    <View style={[styles.container, { marginBottom: theme.spacing.md }, containerStyle]}>
      {label && <Text style={{ color: theme.colors.text, marginBottom: theme.spacing.xs, fontWeight: theme.typography.weights.medium as any }}>{label}</Text>}
      
      <TouchableOpacity
        ref={selectRef as any}
        style={[
          styles.input, 
          { 
            backgroundColor: theme.colors.surface, 
            borderColor: error ? theme.colors.error : theme.colors.border, 
            borderRadius: theme.borderRadius.md,
          }
        ]}
        onPress={openModal}
      >
        <Text style={{ color: hasValue ? theme.colors.text : theme.colors.textSecondary }}>
          {displayValue}
        </Text>
        <ChevronDown size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      
      {error && <Text style={{ color: theme.colors.error, fontSize: theme.typography.sizes.xs, marginTop: theme.spacing.xs }}>{error}</Text>}

      {/* Dropdown Modal */}
      <Modal visible={modalVisible} transparent animationType="none">
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.dropdownContainer, {
                left: dropdownLayout.left,
                width: dropdownLayout.width,
                ...(dropdownLayout.top ? { top: dropdownLayout.top } : {}),
                ...(dropdownLayout.bottom ? { bottom: dropdownLayout.bottom } : {}),
              }]}>
                {options.length === 0 ? (
                  <View style={styles.noOptions}>
                    <Text style={{ color: theme.colors.textSecondary }}>No options available</Text>
                  </View>
                ) : (
                  <FlatList
                    data={options}
                    keyExtractor={(item, index) => String(item.value) + index}
                    renderItem={({ item }) => (
                      <TouchableOpacity 
                        style={[styles.optionItem, currentValue === item.value && { backgroundColor: '#f9f9f9' }]} 
                        onPress={() => handleSelect(item)}
                      >
                        <Text style={[styles.optionText, currentValue === item.value && { color: theme.colors.primary, fontWeight: '600' as any }]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    )}
                    style={{ maxHeight: 250 }}
                    bounces={false}
                    showsVerticalScrollIndicator={true}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  input: { 
    borderWidth: 1, 
    height: 40, 
    paddingHorizontal: 16, 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalOverlay: {
    flex: 1,
    // No background color for transparent popover overlay
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
  optionItem: {
    padding: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
  noOptions: {
    padding: 20,
    alignItems: 'center',
  }
});
