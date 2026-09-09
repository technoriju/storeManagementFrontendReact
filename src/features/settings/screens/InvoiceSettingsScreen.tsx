import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useInvoiceSettingsStore, PaperSize, TaxDisplay } from '../store/invoiceSettings.store';
import { useResponsive } from '../../../shared/hooks/useResponsive';

export const InvoiceSettingsScreen = () => {
  const theme = useTheme();
  const { isDesktop, isTablet } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;

  const { settings, updateSetting, updateColumn } = useInvoiceSettingsStore();

  const paperSizes: PaperSize[] = ['58mm', '80mm', 'A4', 'A5', 'Custom'];
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
      <View style={isLargeScreen ? styles.splitView : styles.singleView}>
        {/* Settings Panel */}
        <ScrollView style={styles.settingsPanel} contentContainerStyle={styles.settingsContent}>
          <Text style={[styles.header, { color: theme.colors.text }]}>Invoice format</Text>

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

        {/* Live Preview Panel (Only on large screens or placed at bottom) */}
        {isLargeScreen && (
          <View style={[styles.previewContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.previewHeader, { color: theme.colors.textSecondary }]}>Wireframe preview</Text>
            <View style={styles.previewWrapper}>
              <View style={[
                styles.receiptSheet,
                { 
                  backgroundColor: theme.colors.background,
                  width: settings.paperSize.includes('mm') ? 220 : 340
                }
              ]}>
                {settings.showLogo && <View style={styles.previewLogo} />}
                {settings.showBusinessName && <Text style={styles.previewTitle}>BUSINESS NAME</Text>}
                {settings.showAddress && <Text style={styles.previewText}>123 Business Rd, City</Text>}
                {settings.showGstin && <Text style={styles.previewText}>GSTIN: 22AAAAA0000A1Z5</Text>}
                
                <View style={styles.previewSpacer} />
                
                {(settings.showInvoiceNumber || settings.showCustomerInfo) && (
                  <View style={styles.previewRow}>
                    {settings.showInvoiceNumber && <Text style={styles.previewText}>INV-001</Text>}
                    {settings.showCustomerInfo && <Text style={styles.previewText}>Customer Name</Text>}
                  </View>
                )}
                
                <View style={styles.previewSpacer} />
                
                <View style={styles.previewTableHead}>
                  {settings.columns.item && <Text style={[styles.previewText, { flex: 2 }]}>Item</Text>}
                  {settings.columns.qty && <Text style={[styles.previewText, { flex: 1, textAlign: 'center' }]}>Qty</Text>}
                  {settings.columns.rate && <Text style={[styles.previewText, { flex: 1, textAlign: 'right' }]}>Rate</Text>}
                  {settings.columns.amount && <Text style={[styles.previewText, { flex: 1, textAlign: 'right' }]}>Amt</Text>}
                </View>
                <View style={styles.previewTableRow}>
                  {settings.columns.item && <View style={[styles.previewLine, { flex: 2, height: 8, marginRight: 8 }]} />}
                  {settings.columns.qty && <View style={[styles.previewLine, { flex: 1, height: 8, marginRight: 8 }]} />}
                  {settings.columns.rate && <View style={[styles.previewLine, { flex: 1, height: 8, marginRight: 8 }]} />}
                  {settings.columns.amount && <View style={[styles.previewLine, { flex: 1, height: 8 }]} />}
                </View>
                <View style={styles.previewTableRow}>
                  {settings.columns.item && <View style={[styles.previewLine, { flex: 2, height: 8, marginRight: 8, width: '60%' }]} />}
                  {settings.columns.qty && <View style={[styles.previewLine, { flex: 1, height: 8, marginRight: 8 }]} />}
                  {settings.columns.rate && <View style={[styles.previewLine, { flex: 1, height: 8, marginRight: 8 }]} />}
                  {settings.columns.amount && <View style={[styles.previewLine, { flex: 1, height: 8 }]} />}
                </View>
                
                <View style={styles.previewSpacer} />
                
                <View style={styles.previewRow}>
                  <Text style={styles.previewText}>Total</Text>
                  <Text style={styles.previewTextBold}>$0.00</Text>
                </View>

                {settings.taxDisplay !== 'none' && (
                  <View style={styles.previewRow}>
                    <Text style={styles.previewTextLight}>Includes Tax ({settings.taxDisplay})</Text>
                  </View>
                )}
                
                <View style={[styles.previewSpacer, { height: 32 }]} />
                
                {settings.showSignature && (
                  <View style={{ alignItems: 'flex-end', marginTop: 16 }}>
                    <View style={{ width: 80, height: 1, backgroundColor: '#999', marginBottom: 4 }} />
                    <Text style={styles.previewTextLight}>Signature</Text>
                  </View>
                )}
                
                {settings.showTerms && (
                  <Text style={[styles.previewTextLight, { marginTop: 16, textAlign: 'center' }]}>Terms & Conditions apply.</Text>
                )}
                
                {!!settings.footerMessage && (
                  <Text style={[styles.previewText, { marginTop: 8, textAlign: 'center' }]}>{settings.footerMessage}</Text>
                )}
              </View>
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
  previewContainer: {
    flex: 1,
    borderLeftWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHeader: {
    position: 'absolute',
    top: 32,
    left: 32,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  receiptSheet: {
    padding: 24,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  previewLogo: {
    width: 40,
    height: 40,
    backgroundColor: '#ccc',
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
    marginBottom: 2,
  },
  previewTextBold: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  previewTextLight: {
    fontSize: 10,
    color: '#777',
    textAlign: 'center',
  },
  previewSpacer: {
    height: 16,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewTableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 4,
    marginBottom: 8,
  },
  previewTableRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  previewLine: {
    backgroundColor: '#ddd',
    borderRadius: 2,
  },
});
