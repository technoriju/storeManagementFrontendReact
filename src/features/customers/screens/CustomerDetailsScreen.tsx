import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { customerRepository } from '../../../core/repositories/CustomerRepository';
import { Customer } from '../../../types/models';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';

export const CustomerDetailsScreen = ({ route, navigation, customerId, onNavigate }: any) => {
  const id = customerId ?? route?.params?.id;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadCustomer();
    }
  }, [id]);

  const loadCustomer = async () => {
    try {
      const data = await customerRepository.getById(Number(id));
      setCustomer(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.loader} size="large" />;
  }

  if (!customer) {
    return (
      <View style={styles.container}>
        <Text>Customer not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.title}>{customer.name}</Text>
          <SyncBadge status={customer.syncStatus || 'synced'} />
        </View>
        <Text style={styles.label}>Email: <Text style={styles.value}>{customer.email || 'N/A'}</Text></Text>
        <Text style={styles.label}>Phone: <Text style={styles.value}>{customer.phone || 'N/A'}</Text></Text>
        <Text style={styles.label}>Address: <Text style={styles.value}>{customer.address || 'N/A'}</Text></Text>
        <Text style={styles.label}>GSTIN: <Text style={styles.value}>{customer.gstin || 'N/A'}</Text></Text>
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => onNavigate ? onNavigate('form', customer.id) : navigation?.navigate('CustomerForm', { id: customer.id })}
      >
        <Text style={styles.buttonText}>Edit Customer</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.paymentButton]} 
        onPress={() => onNavigate ? onNavigate('payment_form', customer.id) : navigation?.navigate('PaymentForm', { customerId: customer.id })}
      >
        <Text style={styles.buttonText}>Add Payment</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.historyButton]} 
        onPress={() => onNavigate ? onNavigate('payment_history', customer.id) : navigation?.navigate('PaymentHistory', { customerId: customer.id })}
      >
        <Text style={styles.buttonText}>View Payment History</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: '#6b7280' }]} 
        onPress={() => onNavigate ? onNavigate('list') : navigation?.goBack?.()}
      >
        <Text style={styles.buttonText}>Back to List</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  loader: { flex: 1, justifyContent: 'center' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 8, marginBottom: 20, elevation: 1, borderWidth: 1, borderColor: '#eee' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: 'bold' },
  value: { fontWeight: 'normal', color: '#333' },
  balance: { fontWeight: 'bold', color: '#d32f2f' },
  button: { backgroundColor: '#007bff', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  paymentButton: { backgroundColor: '#28a745' },
  historyButton: { backgroundColor: '#17a2b8' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});


