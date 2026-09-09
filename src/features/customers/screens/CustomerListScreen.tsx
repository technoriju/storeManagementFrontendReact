import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { customerRepository } from '../../../core/repositories/CustomerRepository';
import { useCustomerStore } from '../store/customerStore';
import { Customer } from '../../../types/models';

export const CustomerListScreen = ({ navigation }: any) => {
  const { customers, setCustomers } = useCustomerStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await customerRepository.getAll();
      setCustomers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

  return (
    <View style={styles.container}>
      <TextInput 
        style={styles.searchInput} 
        placeholder="Search customers..." 
        value={search}
        onChangeText={setSearch}
      />
      <TouchableOpacity 
        style={styles.addButton} 
        onPress={() => navigation.navigate('CustomerForm')}
      >
        <Text style={styles.addButtonText}>+ Add Customer</Text>
      </TouchableOpacity>
      <FlatList
        data={filteredCustomers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('CustomerDetails', { id: item.id })}
          >
            <Text style={styles.name}>{item.name}</Text>
            {item.phone ? <Text style={styles.details}>{item.phone}</Text> : null}
            <Text style={styles.balance}>Balance: ${item.outstandingBalance || 0}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  searchInput: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#ddd' },
  addButton: { backgroundColor: '#007bff', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 1, borderWidth: 1, borderColor: '#eee' },
  name: { fontSize: 16, fontWeight: 'bold' },
  details: { color: '#666', marginTop: 4 },
  balance: { color: '#d32f2f', marginTop: 8, fontWeight: 'bold' }
});
