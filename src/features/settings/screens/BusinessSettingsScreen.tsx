import React from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';

export const BusinessSettingsScreen = () => {
  const theme = useTheme();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Business Profile</Text>
      </View>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Basic information about your business used across the application and on invoices.
      </Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Business Name</Text>
          <TextInput 
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]} 
            placeholder="E.g. Acme Corp" 
            placeholderTextColor={theme.colors.textSecondary}
            defaultValue="Acme Corp"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 16 }]}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Phone Number</Text>
            <TextInput 
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]} 
              placeholder="+1 234 567 8900" 
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Email Address</Text>
            <TextInput 
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]} 
              placeholder="contact@acmecorp.com" 
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="email-address"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Registered Address</Text>
          <TextInput 
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, height: 80, textAlignVertical: 'top' }]} 
            placeholder="123 Business Rd..." 
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>
        
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    maxWidth: 600,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    marginBottom: 40,
  },
  form: {
    // 
  },
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  saveBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 15,
  }
});
