import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { paymentRepository } from '../../../core/repositories/PaymentRepository';
import { Payment } from '../../../types/models';

export const PaymentHistoryScreen = ({ route }: any) => {
  const { customerId, supplierId } = route.params || {};
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, [customerId, supplierId]);

  const loadPayments = async () => {
    try {
      let data: Payment[] = [];
      if (customerId) {
        data = await paymentRepository.getByCustomerId(customerId);
      } else if (supplierId) {
        data = await paymentRepository.getBySupplierId(supplierId);
      }
      setPayments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.loader} size="large" />;
  }

  return (
    <View style={styles.container}>
      {payments.length === 0 ? (
        <Text style={styles.emptyText}>No payments found.</Text>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.type}>{item.type === 'receive' ? 'Received' : 'Paid'}</Text>
                <Text style={[styles.amount, item.type === 'receive' ? styles.receive : styles.pay]}>
                  ${item.amount.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.details}>Method: {item.method}</Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
              {item.notes ? <Text style={styles.notes}>Notes: {item.notes}</Text> : null}
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  loader: { flex: 1, justifyContent: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 16, color: '#666' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 1, borderWidth: 1, borderColor: '#eee' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  type: { fontSize: 16, fontWeight: 'bold' },
  amount: { fontSize: 16, fontWeight: 'bold' },
  receive: { color: '#28a745' },
  pay: { color: '#d32f2f' },
  details: { color: '#555', marginBottom: 4 },
  date: { color: '#888', fontSize: 12, marginBottom: 4 },
  notes: { color: '#666', fontStyle: 'italic', marginTop: 4 }
});
