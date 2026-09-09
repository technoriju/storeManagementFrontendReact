import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { supplierRepository } from '../../../core/repositories/SupplierRepository';
import { useSupplierStore } from '../store/supplierStore';
import { Supplier } from '../../../types/models';

export const SupplierFormScreen = ({ route, navigation }: any) => {
  const { id } = route.params || {};
  const { addSupplier, updateSupplier } = useSupplierStore();
  
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (id) {
      loadSupplier();
    }
  }, [id]);

  const loadSupplier = async () => {
    try {
      const supplier = await supplierRepository.getById(id);
      if (supplier) {
        setName(supplier.name);
        setContactName(supplier.contactName || '');
        setEmail(supplier.email || '');
        setPhone(supplier.phone || '');
        setAddress(supplier.address || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name is required');
      return;
    }

    try {
      const now = new Date().toISOString();
      if (id) {
        const existing = await supplierRepository.getById(id);
        if (existing) {
          const updated: Supplier = {
            ...existing,
            name,
            contactName,
            email,
            phone,
            address,
            updatedAt: now,
            syncStatus: 'pending_update'
          };
          await supplierRepository.update(updated);
          updateSupplier(updated);
        }
      } else {
        const newSupplier: Supplier = {
          id: uuidv4(),
          name,
          contactName,
          email,
          phone,
          address,
          outstandingBalance: 0,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending_insert'
        };
        await supplierRepository.insert(newSupplier);
        addSupplier(newSupplier);
      }
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Failed to save supplier');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Company Name *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter company name" />

      <Text style={styles.label}>Contact Person</Text>
      <TextInput style={styles.input} value={contactName} onChangeText={setContactName} placeholder="Enter contact name" />

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter email" keyboardType="email-address" />

      <Text style={styles.label}>Phone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Enter phone" keyboardType="phone-pad" />

      <Text style={styles.label}>Address</Text>
      <TextInput style={[styles.input, styles.textArea]} value={address} onChangeText={setAddress} placeholder="Enter address" multiline />

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Save Supplier</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  button: { backgroundColor: '#007bff', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16, marginBottom: 32 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
