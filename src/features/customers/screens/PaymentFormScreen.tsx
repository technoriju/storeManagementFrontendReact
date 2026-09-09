import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { paymentRepository } from '../../../core/repositories/PaymentRepository';
import { customerRepository } from '../../../core/repositories/CustomerRepository';
import { supplierRepository } from '../../../core/repositories/SupplierRepository';
import { PaymentMethod, PaymentType, Payment } from '../../../types/models';
import { useCustomerStore } from '../store/customerStore';
import { useSupplierStore } from '../../suppliers/store/supplierStore';

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'upi', 'other', 'split'];
const PAYMENT_TYPES: { label: string, value: PaymentType }[] = [
  { label: 'Receive', value: 'receive' },
  { label: 'Pay', value: 'pay' }
];

export const PaymentFormScreen = ({ route, navigation }: any) => {
  const { customerId, supplierId } = route.params || {};
  const { updateCustomer } = useCustomerStore();
  const { updateSupplier } = useSupplierStore();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [type, setType] = useState<PaymentType>(customerId ? 'receive' : 'pay');
  const [notes, setNotes] = useState('');
  const [reference, setReference] = useState('');

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount greater than 0.');
      return;
    }

    try {
      const now = new Date().toISOString();
      const newPayment: Payment = {
        id: uuidv4(),
        amount: parsedAmount,
        method,
        type,
        reference,
        notes,
        customerId,
        supplierId,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending_insert'
      };

      await paymentRepository.insert(newPayment);

      if (customerId) {
        const customer = await customerRepository.getById(customerId);
        if (customer) {
          const balanceChange = type === 'receive' ? -parsedAmount : parsedAmount;
          const updatedCustomer = {
            ...customer,
            outstandingBalance: (customer.outstandingBalance || 0) + balanceChange,
            updatedAt: now,
            syncStatus: 'pending_update' as const
          };
          await customerRepository.update(updatedCustomer);
          updateCustomer(updatedCustomer);
        }
      } else if (supplierId) {
        const supplier = await supplierRepository.getById(supplierId);
        if (supplier) {
          const balanceChange = type === 'pay' ? -parsedAmount : parsedAmount;
          const updatedSupplier = {
            ...supplier,
            outstandingBalance: (supplier.outstandingBalance || 0) + balanceChange,
            updatedAt: now,
            syncStatus: 'pending_update' as const
          };
          await supplierRepository.update(updatedSupplier);
          updateSupplier(updatedSupplier);
        }
      }

      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save payment.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Amount *</Text>
      <TextInput 
        style={styles.input} 
        value={amount} 
        onChangeText={setAmount} 
        placeholder="Enter amount" 
        keyboardType="numeric" 
      />

      <Text style={styles.label}>Type</Text>
      <View style={styles.row}>
        {PAYMENT_TYPES.map(pt => (
          <TouchableOpacity 
            key={pt.value} 
            style={[styles.chip, type === pt.value && styles.chipSelected]}
            onPress={() => setType(pt.value)}
          >
            <Text style={[styles.chipText, type === pt.value && styles.chipTextSelected]}>{pt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Method</Text>
      <View style={styles.methodsContainer}>
        {PAYMENT_METHODS.map(m => (
          <TouchableOpacity 
            key={m} 
            style={[styles.chip, method === m && styles.chipSelected]}
            onPress={() => setMethod(m)}
          >
            <Text style={[styles.chipText, method === m && styles.chipTextSelected]}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Reference Number (Optional)</Text>
      <TextInput 
        style={styles.input} 
        value={reference} 
        onChangeText={setReference} 
        placeholder="Transaction ID / Cheque No" 
      />

      <Text style={styles.label}>Notes (Optional)</Text>
      <TextInput 
        style={[styles.input, styles.textArea]} 
        value={notes} 
        onChangeText={setNotes} 
        placeholder="Any additional notes" 
        multiline 
      />

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Save Payment</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8 },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  methodsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  chipSelected: { backgroundColor: '#007bff', borderColor: '#007bff' },
  chipText: { color: '#333' },
  chipTextSelected: { color: '#fff', fontWeight: 'bold' },
  button: { backgroundColor: '#28a745', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
