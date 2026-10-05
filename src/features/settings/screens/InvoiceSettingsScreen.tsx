import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useInvoiceSettingsStore, PaperSize, TaxDisplay } from '../store/invoiceSettings.store';
import { useResponsive } from '../../../shared/hooks/useResponsive';

interface InvoiceSettingsScreenProps {
  onNavigate?: (routeId: string) => void;
}

export const InvoiceSettingsScreen: React.FC<InvoiceSettingsScreenProps> = ({ onNavigate }) => {
  const theme = useTheme();

  const { settings, updateSetting, updateColumn } = useInvoiceSettingsStore();

  const paperSizes: PaperSize[] = ['80mm', '140x210mm', 'halfA4Landscape', '58mm', 'A4', 'A5', 'Custom'];
  const taxOptions: { label: string; value: TaxDisplay }[] = [
    { label: 'Exclusive (added at end)', value: 'exclusive' },
    { label: 'Inclusive (in item price)', value: 'inclusive' },
    { label: 'None', value: 'none' },
  ];

  const renderToggle = (label: string, value: boolean, onValueChange: (val: boolean) => void, description?: string) => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleTextContainer}>
        <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>{label}</Text>
        {description && (
          <Text style={[styles.toggleDescription, { color: theme.colors.textSecondary }]}>{description}</Text>
        )}
      </View>
      <Switch 
        value={value} 
        onValueChange={onValueChange} 
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.settingsPanel} contentContainerStyle={styles.settingsContent}>
        <View style={styles.headerRow}>
          <Text style={[styles.header, { color: theme.colors.text }]}>Invoice format</Text>
          {onNavigate && (
            <TouchableOpacity
              style={styles.viewPreviewsBannerBtn}
              onPress={() => onNavigate('invoice_preview')}
            >
              <Text style={styles.viewPreviewsBannerBtnText}>Open All Previews →</Text>
            </TouchableOpacity>
          )}
        </View>

          {/* Paper Size */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Paper format</Text>
            <View style={styles.pillContainer}>
              {paperSizes.map((size) => {
                const isActive = settings.paperSize === size;
                return (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.pill,
                      { borderColor: isActive ? theme.colors.primary : theme.colors.border },
                      isActive && { backgroundColor: theme.colors.primary + '1A' }
                    ]}
                    onPress={() => updateSetting('paperSize', size)}
                  >
                    <Text style={[
                      styles.pillText,
                      { color: isActive ? theme.colors.primary : theme.colors.textSecondary }
                    ]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

          {/* Header Details */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Header details</Text>
            {renderToggle('Business logo', settings.showLogo, (v) => updateSetting('showLogo', v))}
            {renderToggle('Business name', settings.showBusinessName, (v) => updateSetting('showBusinessName', v))}
            {renderToggle('Address', settings.showAddress, (v) => updateSetting('showAddress', v))}
            {renderToggle('GSTIN', settings.showGstin, (v) => updateSetting('showGstin', v))}
            {renderToggle('Invoice number', settings.showInvoiceNumber, (v) => updateSetting('showInvoiceNumber', v))}
            {renderToggle('Customer information', settings.showCustomerInfo, (v) => updateSetting('showCustomerInfo', v), 'Show customer name, phone, and address')}
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

          {/* Table Columns */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Item columns</Text>
            {renderToggle('Item name', settings.columns.item, (v) => updateColumn('item', v))}
            {renderToggle('Quantity', settings.columns.qty, (v) => updateColumn('qty', v))}
            {renderToggle('Rate', settings.columns.rate, (v) => updateColumn('rate', v))}
            {renderToggle('Amount', settings.columns.amount, (v) => updateColumn('amount', v))}
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

          {/* Tax Display */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Tax display</Text>
            {taxOptions.map(option => {
              const isActive = settings.taxDisplay === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={styles.radioRow}
                  onPress={() => updateSetting('taxDisplay', option.value)}
                >
                  <View style={[
                    styles.radioOuter,
                    { borderColor: isActive ? theme.colors.primary : theme.colors.border }
                  ]}>
                    {isActive && <View style={[styles.radioInner, { backgroundColor: theme.colors.primary }]} />}
                  </View>
                  <Text style={[styles.radioLabel, { color: theme.colors.text }]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

          {/* Footer & Extras */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Footer elements</Text>
            {renderToggle('Signature line', settings.showSignature, (v) => updateSetting('showSignature', v))}
            {renderToggle('Terms & Conditions', settings.showTerms, (v) => updateSetting('showTerms', v))}
            
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Footer message</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface
                }
              ]}
              value={settings.footerMessage}
              onChangeText={(t) => updateSetting('footerMessage', t)}
              placeholder="Thank you message..."
              placeholderTextColor={theme.colors.textDisabled}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splitView: {
    flex: 1,
    flexDirection: 'row',
  },
  singleView: {
    flex: 1,
  },
  settingsPanel: {
    flex: 1,
  },
  settingsContent: {
    padding: 32,
    maxWidth: 600,
  },
  header: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    marginVertical: 24,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 15,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleDescription: {
    fontSize: 13,
    marginTop: 4,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioLabel: {
    fontSize: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  viewPreviewsBannerBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewPreviewsBannerBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});


