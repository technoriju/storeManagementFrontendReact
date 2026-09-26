import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Modal } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { supplierRepository } from '../../../core/repositories/SupplierRepository';
import { useSupplierStore } from '../store/supplierStore';
import { Supplier } from '../../../types/models';
import { X } from 'lucide-react-native';
import { AppSelect } from '../../../shared/components/forms/AppSelect';

interface SupplierFormScreenProps {
  supplierId?: string | null;
  onNavigate: (screen: 'list') => void;
}

export const SupplierFormScreen: React.FC<SupplierFormScreenProps> = ({ supplierId, onNavigate }) => {
  const { addSupplier, updateSupplier } = useSupplierStore();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (supplierId) {
      loadSupplier();
    }
  }, [supplierId]);

  const loadSupplier = async () => {
    try {
      const supplier = await supplierRepository.getById(supplierId!);
      if (supplier) {
        const parts = supplier.name.split(' ');
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
        setEmail(supplier.email || '');
        setPhone(supplier.phone || '');
        setAddress(supplier.address || '');
        // In a real app we'd parse city/state from address if not in DB
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert('First Name is required');
      return;
    }

    const fullName = lastName.trim() ? `${firstName} ${lastName}` : firstName;
    const fullAddress = [address, city, state, country, postalCode].filter(Boolean).join(', ');

    try {
      const now = new Date().toISOString();
      if (supplierId) {
        const existing = await supplierRepository.getById(supplierId);
        if (existing) {
          const updated: Supplier = {
            ...existing,
            name: fullName,
            email,
            phone,
            address: fullAddress,
            updatedAt: now,
            syncStatus: 'pending_update'
          };
          await supplierRepository.update(updated);
          updateSupplier(updated);
        }
      } else {
        const newSupplier: Supplier = {
          id: uuidv4(),
          name: fullName,
          email,
          phone,
          address: fullAddress,
          outstandingBalance: 0,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending_insert'
        };
        await supplierRepository.insert(newSupplier);
        addSupplier(newSupplier);
      }
      onNavigate('list');
    } catch (e) {
      console.error(e);
      Alert.alert('Failed to save supplier');
    }
  };

  return (
    <Modal transparent visible animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{supplierId ? 'Edit Supplier' : 'Add Supplier'}</Text>
            <TouchableOpacity onPress={() => onNavigate('list')} style={styles.closeButton}>
              <X size={16} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Form Fields */}
            <View style={styles.row}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>First Name <Text style={styles.asterisk}>*</Text></Text>
                <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Last Name <Text style={styles.asterisk}>*</Text></Text>
                <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />
              </View>
            </View>

            <View style={styles.fullCol}>
              <Text style={styles.label}>Email <Text style={styles.asterisk}>*</Text></Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />
            </View>

            <View style={styles.fullCol}>
              <Text style={styles.label}>Phone <Text style={styles.asterisk}>*</Text></Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>

            <View style={styles.fullCol}>
              <Text style={styles.label}>Address <Text style={styles.asterisk}>*</Text></Text>
              <TextInput style={styles.input} value={address} onChangeText={setAddress} />
            </View>

            <View style={styles.row}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>City <Text style={styles.asterisk}>*</Text></Text>
                <AppSelect options={[]} placeholder="Select" containerStyle={{ marginBottom: 0 }} />
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label}>State <Text style={styles.asterisk}>*</Text></Text>
                <AppSelect options={[]} placeholder="Select" containerStyle={{ marginBottom: 0 }} />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Country <Text style={styles.asterisk}>*</Text></Text>
                <AppSelect options={[]} placeholder="Select" containerStyle={{ marginBottom: 0 }} />
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Postal Code <Text style={styles.asterisk}>*</Text></Text>
                <TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} />
              </View>
            </View>

            {/* Status Toggle */}
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status</Text>
              <TouchableOpacity 
                style={[styles.toggle, isActive ? styles.toggleActive : null]}
                onPress={() => setIsActive(!isActive)}
              >
                <View style={[styles.toggleThumb, isActive ? styles.toggleThumbActive : null]} />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => onNavigate('list')}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
              <Text style={styles.submitBtnText}>{supplierId ? 'Save Supplier' : 'Add Supplier'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 16
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    backgroundColor: 'red',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -8,
    marginBottom: 16,
  },
  halfCol: {
    flex: 1,
    paddingHorizontal: 8,
  },
  fullCol: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    fontWeight: '500',
  },
  asterisk: {
    color: 'red',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: '#fff',
    ...(Platform.OS === 'web' && { outlineStyle: 'none' } as any),
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginTop: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ccc',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#10B981',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  cancelBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  cancelBtnText: {
    color: 'white',
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#F97316',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  submitBtnText: {
    color: 'white',
    fontWeight: '500',
  }
});
