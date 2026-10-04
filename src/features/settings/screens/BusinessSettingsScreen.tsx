import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useInvoiceSettingsStore } from '../store/invoiceSettings.store';

export const BusinessSettingsScreen = () => {
  const theme = useTheme();
  const { settings, updateBusinessProfile } = useInvoiceSettingsStore();
  const business = settings.businessProfile;

  const [name, setName] = useState(business.businessName || '');
  const [tagline, setTagline] = useState(business.tagline || '');
  const [phone, setPhone] = useState(business.phone || '');
  const [email, setEmail] = useState(business.email || '');
  const [address, setAddress] = useState(business.address || '');
  const [gstin, setGstin] = useState(business.gstin || '');
  const [pan, setPan] = useState(business.pan || '');
  const [state, setState] = useState(business.state || '');
  const [stateCode, setStateCode] = useState(business.stateCode || '');
  const [bankName, setBankName] = useState(business.bankName || '');
  const [accountNumber, setAccountNumber] = useState(business.accountNumber || '');
  const [ifscCode, setIfscCode] = useState(business.ifscCode || '');
  const [branch, setBranch] = useState(business.branch || '');
  const [upiId, setUpiId] = useState(business.upiId || '');

  const handleSave = () => {
    updateBusinessProfile({
      businessName: name,
      tagline,
      phone,
      email,
      address,
      gstin,
      pan,
      state,
      stateCode,
      bankName,
      accountNumber,
      ifscCode,
      branch,
      upiId,
    });
    Alert.alert('Success', 'Business profile saved successfully! Receipts will now use these updated details.');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Business Profile & Invoicing Details</Text>
      </View>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Information about your business displayed on Thermal receipts (80mm) and Regular Half A4 landscape invoices.
      </Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Business / Company Name</Text>
          <TextInput 
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]} 
            placeholder="E.g. MAHA TRADING CO." 
            placeholderTextColor={theme.colors.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Tagline / Business Nature</Text>
          <TextInput 
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]} 
            placeholder="E.g. Wholesale & Retail Distributors" 
            placeholderTextColor={theme.colors.textSecondary}
            value={tagline}
            onChangeText={setTagline}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 16 }]}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Phone Number</Text>
            <TextInput 
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]} 
              placeholder="+91 98200 12345" 
              placeholderTextColor={theme.colors.textSecondary}
              value={phone}
              onChangeText={setPhone}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Email Address</Text>
            <TextInput 
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]} 
              placeholder="sales@mahatrading.com" 
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Registered Business Address</Text>
          <TextInput 
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, height: 70, textAlignVertical: 'top' }]} 
            placeholder="Shop No. 12, Market Yard, Station Road..." 
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={3}
            value={address}
            onChangeText={setAddress}
          />
        </View>

        {/* GSTIN & State Code */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1.2, marginRight: 16 }]}>
            <Text style={[styles.label, { color: theme.colors.text }]}>GSTIN</Text>
            <TextInput 
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]} 
              placeholder="27AABCM1234F1Z8" 
              placeholderTextColor={theme.colors.textSecondary}
              value={gstin}
              onChangeText={setGstin}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 0.8 }]}>
            <Text style={[styles.label, { color: theme.colors.text }]}>State & Code</Text>
            <TextInput 
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]} 
              placeholder="Maharashtra (27)" 
              placeholderTextColor={theme.colors.textSecondary}
              value={state}
              onChangeText={setState}
            />
          </View>
        </View>

        {/* Bank Details for Wholesale */}
        <Text style={[styles.sectionSubtitle, { color: theme.colors.primary }]}>
          Bank Details (Shown on Wholesale Invoices)
        </Text>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 16 }]}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Bank Name</Text>
            <TextInput 
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]} 
              placeholder="HDFC Bank" 
              placeholderTextColor={theme.colors.textSecondary}
              value={bankName}
              onChangeText={setBankName}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Account Number</Text>
            <TextInput 
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]} 
              placeholder="50200012345678" 
              placeholderTextColor={theme.colors.textSecondary}
              value={accountNumber}
              onChangeText={setAccountNumber}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 16 }]}>
            <Text style={[styles.label, { color: theme.colors.text }]}>IFSC Code</Text>
            <TextInput 
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]} 
              placeholder="HDFC0001234" 
              placeholderTextColor={theme.colors.textSecondary}
              value={ifscCode}
              onChangeText={setIfscCode}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: theme.colors.text }]}>UPI ID (for QR Code)</Text>
            <TextInput 
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]} 
              placeholder="mahatrading@hdfcbank" 
              placeholderTextColor={theme.colors.textSecondary}
              value={upiId}
              onChangeText={setUpiId}
            />
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>Save Business Profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    maxWidth: 700,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  sectionSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 16,
  },
  form: {
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  saveBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  }
});
