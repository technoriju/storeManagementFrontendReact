import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supplierRepository } from '../../../core/repositories/SupplierRepository';
import { Supplier } from '../../../types/models';

export const SupplierDetailsScreen = ({ route, navigation }: any) => {
  const { id } = route.params || {};
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadSupplier();
    }
  }, [id]);

  const loadSupplier = async () => {
    try {
      const data = await supplierRepository.getById(id);
      setSupplier(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.loader} size="large" />;
  }

  if (!supplier) {
    return (
      <View style={styles.container}>
        <Text>Supplier not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{supplier.name}</Text>
        <Text style={styles.label}>Contact Person: <Text style={styles.value}>{supplier.contactName || 'N/A'}</Text></Text>
        <Text style={styles.label}>Email: <Text style={styles.value}>{supplier.email || 'N/A'}</Text></Text>
        <Text style={styles.label}>Phone: <Text style={styles.value}>{supplier.phone || 'N/A'}</Text></Text>
        <Text style={styles.label}>Address: <Text style={styles.value}>{supplier.address || 'N/A'}</Text></Text>
        <Text style={styles.label}>Outstanding Balance: <Text style={styles.balance}>${supplier.outstandingBalance || 0}</Text></Text>
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => navigation.navigate('SupplierForm', { id: supplier.id })}
      >
        <Text style={styles.buttonText}>Edit Supplier</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.paymentButton]} 
        onPress={() => navigation.navigate('PaymentForm', { supplierId: supplier.id })}
      >
        <Text style={styles.buttonText}>Add Payment</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.historyButton]} 
        onPress={() => navigation.navigate('PaymentHistory', { supplierId: supplier.id })}
      >
        <Text style={styles.buttonText}>View Payment History</Text>
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
