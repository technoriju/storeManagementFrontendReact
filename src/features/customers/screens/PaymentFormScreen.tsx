import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform,
  Pressable,
} from 'react-native';
import { paymentRepository } from '../../../core/repositories/PaymentRepository';
import { customerRepository } from '../../../core/repositories/CustomerRepository';
import { supplierRepository } from '../../../core/repositories/SupplierRepository';
import { PaymentMethod, PaymentType, Payment, Customer, Supplier } from '../../../types/models';
import { useCustomerStore } from '../store/customerStore';
import { useSupplierStore } from '../../suppliers/store/supplierStore';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AppSelect, AppSelectOption } from '../../../shared/components/forms/AppSelect';
import { X, ArrowDownLeft, ArrowUpRight, DollarSign, User, Building2 } from 'lucide-react-native';

const PAYMENT_METHODS: { label: string; value: PaymentMethod }[] = [
  { label: 'Cash', value: 'cash' },
  { label: 'UPI / QR', value: 'upi' },
  { label: 'Card', value: 'card' },
  { label: 'Split', value: 'split' },
  { label: 'Other', value: 'other' },
];

export interface PaymentFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialEntityType?: 'customer' | 'supplier';
  initialPaymentType?: 'receive' | 'pay';
  entityId?: number | null;
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  visible,
  onClose,
  onSuccess,
  initialEntityType = 'customer',
  initialPaymentType,
  entityId,
}) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const { updateCustomer } = useCustomerStore();
  const { updateSupplier } = useSupplierStore();

  const [activeEntityType, setActiveEntityType] = useState<'customer' | 'supplier'>(initialEntityType);
  const [activePaymentType, setActivePaymentType] = useState<PaymentType>(
    initialPaymentType || (initialEntityType === 'customer' ? 'receive' : 'pay')
  );

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(entityId ? Number(entityId) : null);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setActiveEntityType(initialEntityType);
      setActivePaymentType(initialPaymentType || (initialEntityType === 'customer' ? 'receive' : 'pay'));
      setSelectedPartyId(entityId ? Number(entityId) : null);
      setAmount('');
      setMethod('cash');
      setReference('');
      setNotes('');

      loadParties();
    }
  }, [visible, initialEntityType, initialPaymentType, entityId]);

  const loadParties = async () => {
    try {
      const [custList, suppList] = await Promise.all([
        customerRepository.getAll(),
        supplierRepository.getAll(),
      ]);
      setCustomers(custList);
      setSuppliers(suppList);

      if (!entityId) {
        if (initialEntityType === 'customer' && custList.length > 0) {
          setSelectedPartyId(custList[0].id);
        } else if (initialEntityType === 'supplier' && suppList.length > 0) {
          setSelectedPartyId(suppList[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load parties for payment form', e);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedPartyId);
  const selectedSupplier = suppliers.find((s) => s.id === selectedPartyId);

  const customerOptions: AppSelectOption[] = customers.map((c) => ({
    label: `${c.name} (Due: ₹${(c.outstandingBalance || 0).toFixed(2)})`,
    value: c.id,
  }));

  const supplierOptions: AppSelectOption[] = suppliers.map((s) => ({
    label: `${s.name} (Due: ₹${(s.outstandingBalance || 0).toFixed(2)})`,
    value: s.id,
  }));

  const handleEntityTypeChange = (type: 'customer' | 'supplier') => {
    setActiveEntityType(type);
    if (type === 'customer') {
      setActivePaymentType('receive');
      setSelectedPartyId(customers[0]?.id || null);
    } else {
      setActivePaymentType('pay');
      setSelectedPartyId(suppliers[0]?.id || null);
    }
  };

  const handleSave = async () => {
    if (!selectedPartyId) {
      Alert.alert('Validation Error', `Please select a ${activeEntityType}.`);
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const newPayment: Payment = {
        id: Math.floor(Math.random() * -1000000000),
        amount: parsedAmount,
        method,
        type: activePaymentType,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        customerId: activeEntityType === 'customer' ? selectedPartyId : undefined,
        supplierId: activeEntityType === 'supplier' ? selectedPartyId : undefined,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending_insert',
      };

      await paymentRepository.insert(newPayment);

      // Update party balances
      if (activeEntityType === 'customer') {
        const customer = await customerRepository.getById(selectedPartyId);
        if (customer) {
          // 'receive' reduces customer balance (they paid their debt)
          const delta = activePaymentType === 'receive' ? -parsedAmount : parsedAmount;
          const updatedCustomer = {
            ...customer,
            outstandingBalance: (customer.outstandingBalance || 0) + delta,
            updatedAt: now,
            syncStatus: 'pending_update' as const,
          };
          await customerRepository.update(updatedCustomer);
          updateCustomer(updatedCustomer);
        }
      } else {
        const supplier = await supplierRepository.getById(selectedPartyId);
        if (supplier) {
          // 'pay' reduces supplier balance (we paid our debt)
          const delta = activePaymentType === 'pay' ? -parsedAmount : parsedAmount;
          const updatedSupplier = {
            ...supplier,
            outstandingBalance: (supplier.outstandingBalance || 0) + delta,
            updatedAt: now,
            syncStatus: 'pending_update' as const,
          };
          await supplierRepository.update(updatedSupplier);
          updateSupplier(updatedSupplier);
        }
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (e) {
      console.error('Failed to save payment', e);
      Alert.alert('Error', 'Failed to save payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {activePaymentType === 'receive' ? 'Receive Payment (In)' : 'Add Payment (Out)'}
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                {activeEntityType === 'customer' ? 'Customer transaction record' : 'Supplier payout record'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Party Type Toggle */}
            {!entityId && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Transaction Party</Text>
                <View style={styles.tabToggleRow}>
                  <TouchableOpacity
                    style={[styles.tabBtn, activeEntityType === 'customer' && styles.tabBtnActive]}
                    onPress={() => handleEntityTypeChange('customer')}
                  >
                    <User size={14} color={activeEntityType === 'customer' ? '#fff' : theme.colors.textSecondary} />
                    <Text style={[styles.tabBtnText, activeEntityType === 'customer' && styles.tabBtnTextActive]}>
                      Customer
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tabBtn, activeEntityType === 'supplier' && styles.tabBtnActive]}
                    onPress={() => handleEntityTypeChange('supplier')}
                  >
                    <Building2 size={14} color={activeEntityType === 'supplier' ? '#fff' : theme.colors.textSecondary} />
                    <Text style={[styles.tabBtnText, activeEntityType === 'supplier' && styles.tabBtnTextActive]}>
                      Supplier
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Payment Direction Toggle */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Payment Direction</Text>
              <View style={styles.directionRow}>
                <TouchableOpacity
                  style={[
                    styles.directionBtn,
                    activePaymentType === 'receive' && { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
                  ]}
                  onPress={() => setActivePaymentType('receive')}
                >
                  <ArrowDownLeft size={16} color={activePaymentType === 'receive' ? '#16A34A' : '#64748B'} />
                  <Text style={[styles.directionText, activePaymentType === 'receive' && { color: '#16A34A', fontWeight: '700' }]}>
                    Receive (Money In)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.directionBtn,
                    activePaymentType === 'pay' && { backgroundColor: '#FEE2E2', borderColor: '#DC2626' },
                  ]}
                  onPress={() => setActivePaymentType('pay')}
                >
                  <ArrowUpRight size={16} color={activePaymentType === 'pay' ? '#DC2626' : '#64748B'} />
                  <Text style={[styles.directionText, activePaymentType === 'pay' && { color: '#DC2626', fontWeight: '700' }]}>
                    Pay (Money Out)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Select Party */}
            <View style={styles.sectionBlock}>
              <AppSelect
                label={activeEntityType === 'customer' ? 'Select Customer *' : 'Select Supplier *'}
                placeholder={`Search or choose ${activeEntityType}...`}
                options={activeEntityType === 'customer' ? customerOptions : supplierOptions}
                value={selectedPartyId}
                onSelect={setSelectedPartyId}
                searchable
              />

              {/* Show party balance preview */}
              {activeEntityType === 'customer' && selectedCustomer && (
                <View style={styles.balanceInfo}>
                  <Text style={styles.balanceInfoLabel}>Current Customer Due:</Text>
                  <Text style={[styles.balanceInfoValue, { color: (selectedCustomer.outstandingBalance || 0) > 0 ? '#DC2626' : '#16A34A' }]}>
                    ₹{(selectedCustomer.outstandingBalance || 0).toFixed(2)}
                  </Text>
                </View>
              )}

              {activeEntityType === 'supplier' && selectedSupplier && (
                <View style={styles.balanceInfo}>
                  <Text style={styles.balanceInfoLabel}>Current Supplier Balance:</Text>
                  <Text style={[styles.balanceInfoValue, { color: (selectedSupplier.outstandingBalance || 0) > 0 ? '#DC2626' : '#16A34A' }]}>
                    ₹{(selectedSupplier.outstandingBalance || 0).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>

            {/* Amount */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Amount (₹) *</Text>
              <View style={[styles.amountInputContainer, { borderColor: theme.colors.border }]}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={[styles.amountInput, { color: theme.colors.text }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Payment Method */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Payment Method</Text>
              <View style={styles.methodsRow}>
                {PAYMENT_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.methodChip, method === m.value && styles.methodChipActive]}
                    onPress={() => setMethod(m.value)}
                  >
                    <Text style={[styles.methodChipText, method === m.value && styles.methodChipTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Reference Number */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Reference / Transaction ID</Text>
              <TextInput
                style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                value={reference}
                onChangeText={setReference}
                placeholder="UPI ref, Cheque No, Bank Trx ID..."
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            {/* Notes */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Notes / Remarks</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional payment notes..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: activePaymentType === 'receive' ? '#10B981' : '#F97316' },
              ]}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Saving...' : activePaymentType === 'receive' ? 'Save Receipt' : 'Save Payment'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const PaymentFormScreen = ({
  route,
  navigation,
  entityId,
  entityType = 'customer',
  initialPaymentType,
  onNavigate,
}: any) => {
  const customerId = entityType === 'customer' ? entityId : (route?.params?.customerId ?? null);
  const supplierId = entityType === 'supplier' ? entityId : (route?.params?.supplierId ?? null);

  const handleClose = () => {
    if (onNavigate) {
      onNavigate('payment_history', customerId || supplierId || undefined);
    } else {
      navigation?.goBack?.();
    }
  };

  return (
    <PaymentFormModal
      visible={true}
      onClose={handleClose}
      onSuccess={handleClose}
      initialEntityType={entityType}
      initialPaymentType={initialPaymentType}
      entityId={customerId || supplierId}
    />
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '90%',
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
  },
  modalBody: {
    padding: 20,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 4,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#1E293B',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  directionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  directionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
    gap: 6,
  },
  directionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  balanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  balanceInfoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  balanceInfoValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 46,
    backgroundColor: '#fff',
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  methodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  methodChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  methodChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  methodChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    backgroundColor: '#fff',
  },
  notesInput: {
    height: 70,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  submitButton: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
