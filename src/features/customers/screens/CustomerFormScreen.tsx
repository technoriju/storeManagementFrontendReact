import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { customerRepository } from '../../../core/repositories/CustomerRepository';
import { useCustomerStore } from '../store/customerStore';
import { Customer } from '../../../types/models';

export const CustomerFormScreen = ({ route, navigation }: any) => {
  const { id } = route.params || {};
  const { addCustomer, updateCustomer } = useCustomerStore();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');

  useEffect(() => {
    if (id) {
      loadCustomer();
    }
  }, [id]);

  const loadCustomer = async () => {
    try {
      const customer = await customerRepository.getById(id);
      if (customer) {
        setName(customer.name);
        setEmail(customer.email || '');
        setPhone(customer.phone || '');
        setAddress(customer.address || '');
        setTaxId(customer.taxId || '');
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
        const existing = await customerRepository.getById(id);
        if (existing) {
          const updated: Customer = {
            ...existing,
            name,
            email,
            phone,
            address,
            taxId,
            updatedAt: now,
            syncStatus: 'pending_update'
          };
          await customerRepository.update(updated);
          updateCustomer(updated);
        }
      } else {
        const newCustomer: Customer = {
          id: uuidv4(),
          name,
          email,
          phone,
          address,
          taxId,
          outstandingBalance: 0,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending_insert'
        };
        await customerRepository.insert(newCustomer);
        addCustomer(newCustomer);
      }
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Failed to save customer');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Name *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter name" />

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter email" keyboardType="email-address" />

      <Text style={styles.label}>Phone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Enter phone" keyboardType="phone-pad" />

      <Text style={styles.label}>Address</Text>
      <TextInput style={[styles.input, styles.textArea]} value={address} onChangeText={setAddress} placeholder="Enter address" multiline />

      <Text style={styles.label}>Tax ID</Text>
      <TextInput style={styles.input} value={taxId} onChangeText={setTaxId} placeholder="Enter tax ID" />

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Save Customer</Text>
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
