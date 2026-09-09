import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { supplierRepository } from '../../../core/repositories/SupplierRepository';
import { useSupplierStore } from '../store/supplierStore';
import { Supplier } from '../../../types/models';

export const SupplierListScreen = ({ navigation }: any) => {
  const { suppliers, setSuppliers } = useSupplierStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const data = await supplierRepository.getAll();
      setSuppliers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.phone && s.phone.includes(search))
  );

  return (
    <View style={styles.container}>
      <TextInput 
        style={styles.searchInput} 
        placeholder="Search suppliers..." 
        value={search}
        onChangeText={setSearch}
      />
      <TouchableOpacity 
        style={styles.addButton} 
        onPress={() => navigation.navigate('SupplierForm')}
      >
        <Text style={styles.addButtonText}>+ Add Supplier</Text>
      </TouchableOpacity>
      <FlatList
        data={filteredSuppliers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('SupplierDetails', { id: item.id })}
          >
            <Text style={styles.name}>{item.name}</Text>
            {item.contactName ? <Text style={styles.details}>Contact: {item.contactName}</Text> : null}
            {item.phone ? <Text style={styles.details}>{item.phone}</Text> : null}
            <Text style={styles.balance}>Balance Owed: ${item.outstandingBalance || 0}</Text>
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
