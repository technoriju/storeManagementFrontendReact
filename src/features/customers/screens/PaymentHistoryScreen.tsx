import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { paymentRepository } from '../../../core/repositories/PaymentRepository';
import { customerRepository } from '../../../core/repositories/CustomerRepository';
import { supplierRepository } from '../../../core/repositories/SupplierRepository';
import { Payment, Customer, Supplier } from '../../../types/models';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { AppDialog } from '../../../shared/components/feedback/AppDialog';
import { useSyncStore } from '../../../core/sync/useSyncStore';
import {
  FileText,
  FileSpreadsheet,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  CreditCard,
  Eye,
  Trash2,
  ChevronDown,
  Check,
  Building2,
  User,
  ArrowLeft,
} from 'lucide-react-native';
import { PaymentFormModal } from './PaymentFormScreen';

interface Props {
  route?: any;
  navigation?: any;
  entityId?: string | number | null;
  entityType?: 'customer' | 'supplier';
  onNavigate?: (screen: any, id?: any, options?: any) => void;
}

export const PaymentHistoryScreen: React.FC<Props> = ({
  route,
  navigation,
  entityId,
  entityType = 'customer',
  onNavigate,
}) => {
  const theme = useTheme();
  const customerId = entityType === 'customer' ? entityId : (route?.params?.customerId ?? null);
  const supplierId = entityType === 'supplier' ? entityId : (route?.params?.supplierId ?? null);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [customerMap, setCustomerMap] = useState<Record<number, Customer>>({});
  const [supplierMap, setSupplierMap] = useState<Record<number, Supplier>>({});
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'receive' | 'pay'>('all');
  const [partyTypeFilter, setPartyTypeFilter] = useState<'all' | 'customer' | 'supplier'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);

  // Modals & Details
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [modalInitialEntityType, setModalInitialEntityType] = useState<'customer' | 'supplier'>('customer');
  const [modalInitialPaymentType, setModalInitialPaymentType] = useState<'receive' | 'pay'>('receive');
  const [viewedPayment, setViewedPayment] = useState<Payment | null>(null);

  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allCustomers, allSuppliers] = await Promise.all([
        customerRepository.getAll(),
        supplierRepository.getAll(),
      ]);

      const cMap: Record<number, Customer> = {};
      allCustomers.forEach((c) => {
        if (c.id) cMap[c.id] = c;
        if (c.backendId) cMap[c.backendId] = c;
      });
      setCustomerMap(cMap);

      const sMap: Record<number, Supplier> = {};
      allSuppliers.forEach((s) => {
        if (s.id) sMap[s.id] = s;
        if (s.backendId) sMap[s.backendId] = s;
      });
      setSupplierMap(sMap);

      let data: Payment[] = [];
      if (customerId) {
        data = await paymentRepository.getByCustomerId(customerId);
      } else if (supplierId) {
        data = await paymentRepository.getBySupplierId(supplierId);
      } else {
        data = await paymentRepository.getAll();
      }

      setPayments(data);
    } catch (e) {
      console.error('Failed to load payments data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [customerId, supplierId, entityType, lastSyncedAt]);

  // Summary Metrics calculations
  const metrics = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let customerIn = 0;
    let supplierOut = 0;
    let inCount = 0;
    let outCount = 0;

    payments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      if (p.type === 'receive') {
        totalIn += amt;
        inCount += 1;
        if (p.customerId) customerIn += amt;
      } else if (p.type === 'pay') {
        totalOut += amt;
        outCount += 1;
        if (p.supplierId) supplierOut += amt;
      }
    });

    const netCashflow = totalIn - totalOut;

    return {
      totalIn,
      totalOut,
      customerIn,
      supplierOut,
      inCount,
      outCount,
      netCashflow,
      totalTransactions: payments.length,
    };
  }, [payments]);

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      // Direction filter
      if (directionFilter !== 'all' && item.type !== directionFilter) return false;

      // Party Type filter
      if (partyTypeFilter === 'customer' && !item.customerId) return false;
      if (partyTypeFilter === 'supplier' && !item.supplierId) return false;

      // Method filter
      if (methodFilter !== 'all' && item.method?.toLowerCase() !== methodFilter.toLowerCase()) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const partyName = item.customerId
          ? (customerMap[item.customerId]?.name || '').toLowerCase()
          : item.supplierId
          ? (supplierMap[item.supplierId]?.name || '').toLowerCase()
          : '';
        const ref = (item.reference || '').toLowerCase();
        const notes = (item.notes || '').toLowerCase();
        const amountStr = String(item.amount);

        const match =
          partyName.includes(q) ||
          ref.includes(q) ||
          notes.includes(q) ||
          amountStr.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [payments, directionFilter, partyTypeFilter, methodFilter, searchQuery, customerMap, supplierMap]);

  const openPaymentModal = (entity: 'customer' | 'supplier', direction: 'receive' | 'pay') => {
    setModalInitialEntityType(entity);
    setModalInitialPaymentType(direction);
    setPaymentModalVisible(true);
  };

  const handleDeletePayment = (payment: Payment) => {
    const doDelete = async () => {
      try {
        // Rollback balance on deletion
        if (payment.customerId) {
          const cust = await customerRepository.getById(payment.customerId);
          if (cust) {
            const rollbackDelta = payment.type === 'receive' ? payment.amount : -payment.amount;
            await customerRepository.update({
              ...cust,
              outstandingBalance: (cust.outstandingBalance || 0) + rollbackDelta,
              updatedAt: new Date().toISOString(),
              syncStatus: 'pending_update',
            });
          }
        } else if (payment.supplierId) {
          const supp = await supplierRepository.getById(payment.supplierId);
          if (supp) {
            const rollbackDelta = payment.type === 'pay' ? payment.amount : -payment.amount;
            await supplierRepository.update({
              ...supp,
              outstandingBalance: (supp.outstandingBalance || 0) + rollbackDelta,
              updatedAt: new Date().toISOString(),
              syncStatus: 'pending_update',
            });
          }
        }

        await paymentRepository.delete(payment.id);
        loadData();
      } catch (e) {
        console.error('Failed to delete payment', e);
        Alert.alert('Error', 'Failed to delete payment record.');
      }
    };

    if (Platform.OS === 'web') {
      if ((globalThis as any).confirm(`Are you sure you want to delete this payment of ₹${payment.amount}?`)) {
        doDelete();
      }
      return;
    }

    Alert.alert(
      'Delete Payment',
      `Are you sure you want to delete payment of ₹${payment.amount}? Associated balance will be restored.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]
    );
  };

  // Header action buttons matching other screens
  const headerActions = (
    <View style={styles.headerActionsWrap}>
      {customerId && (
        <Pressable
          style={[styles.backOutlineBtn, { borderColor: theme.colors.border }]}
          onPress={() => onNavigate ? onNavigate('details', customerId) : navigation?.goBack?.()}
        >
          <ArrowLeft size={15} color={theme.colors.text} />
          <Text style={[styles.backOutlineText, { color: theme.colors.text }]}>Back to Details</Text>
        </Pressable>
      )}

      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
        <FileText size={16} color="#E11D48" />
      </Pressable>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
        <FileSpreadsheet size={16} color="#10B981" />
      </Pressable>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]} onPress={loadData}>
        <RefreshCw size={16} color={theme.colors.textSecondary} />
      </Pressable>

      {/* Receive Payment (In) */}
      <Pressable
        style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
        onPress={() => openPaymentModal('customer', 'receive')}
      >
        <ArrowDownLeft size={16} color="white" />
        <Text style={styles.actionBtnText}>Receive Payment</Text>
      </Pressable>

      {/* Add Payment / Pay Out (Out) */}
      <Pressable
        style={[styles.actionBtn, { backgroundColor: '#F97316' }]}
        onPress={() => openPaymentModal('supplier', 'pay')}
      >
        <ArrowUpRight size={16} color="white" />
        <Text style={styles.actionBtnText}>Add Payment</Text>
      </Pressable>
    </View>
  );

  // Table filter toolbar options
  const filterToolbar = (
    <View style={styles.filtersRow}>
      {/* Direction Pills */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, directionFilter === 'all' && styles.segmentBtnActive]}
          onPress={() => setDirectionFilter('all')}
        >
          <Text style={[styles.segmentBtnText, directionFilter === 'all' && styles.segmentBtnTextActive]}>
            All ({payments.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, directionFilter === 'receive' && styles.segmentBtnActive]}
          onPress={() => setDirectionFilter('receive')}
        >
          <Text style={[styles.segmentBtnText, directionFilter === 'receive' && styles.segmentBtnTextActive]}>
            Received In ({metrics.inCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, directionFilter === 'pay' && styles.segmentBtnActive]}
          onPress={() => setDirectionFilter('pay')}
        >
          <Text style={[styles.segmentBtnText, directionFilter === 'pay' && styles.segmentBtnTextActive]}>
            Paid Out ({metrics.outCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Method Dropdown */}
      <View style={styles.dropdownWrap}>
        <TouchableOpacity
          style={[styles.filterDropdown, { borderColor: theme.colors.border }]}
          onPress={() => setShowMethodDropdown(!showMethodDropdown)}
        >
          <Text style={[styles.filterDropdownText, { color: theme.colors.text }]}>
            {methodFilter === 'all' ? 'All Methods' : methodFilter.toUpperCase()}
          </Text>
          <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        {showMethodDropdown && (
          <View style={[styles.dropdownMenu, { borderColor: theme.colors.border }]}>
            {['all', 'cash', 'upi', 'card', 'split', 'other'].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.dropdownMenuItem, methodFilter === m && { backgroundColor: '#F1F5F9' }]}
                onPress={() => {
                  setMethodFilter(m);
                  setShowMethodDropdown(false);
                }}
              >
                <Text style={{ fontSize: 13, color: methodFilter === m ? '#2563EB' : theme.colors.text }}>
                  {m === 'all' ? 'All Methods' : m.toUpperCase()}
                </Text>
                {methodFilter === m && <Check size={14} color="#2563EB" />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const columns = [
    {
      key: 'code',
      title: 'Voucher Ref',
      width: 140,
      render: (val: any, item: Payment) => (
        <Text style={{ fontWeight: '600', color: theme.colors.text, fontSize: 13 }}>
          {item.reference || `PAY-${Math.abs(item.id).toString().slice(-4)}`}
        </Text>
      ),
    },
    {
      key: 'party',
      title: 'Party Name',
      flex: 2,
      minWidth: 180,
      render: (val: any, item: Payment) => {
        const isCust = !!item.customerId;
        const name = isCust
          ? (item as any).customerName || (item as any).partyName || customerMap[Number(item.customerId)]?.name || customerMap[String(item.customerId) as any]?.name || (item.customerId ? `Customer #${item.customerId}` : 'Customer')
          : item.supplierId
          ? (item as any).supplierName || (item as any).partyName || supplierMap[Number(item.supplierId)]?.name || supplierMap[String(item.supplierId) as any]?.name || (item.supplierId ? `Supplier #${item.supplierId}` : 'Supplier')
          : (item as any).partyName || 'General';

        return (
          <View>
            <Text style={{ fontWeight: '600', color: theme.colors.text, fontSize: 13 }}>{name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
              <View style={[styles.partyBadge, { backgroundColor: isCust ? '#EFF6FF' : '#F5F3FF' }]}>
                {isCust ? (
                  <User size={10} color="#2563EB" style={{ marginRight: 3 }} />
                ) : (
                  <Building2 size={10} color="#7C3AED" style={{ marginRight: 3 }} />
                )}
                <Text style={{ fontSize: 10, fontWeight: '700', color: isCust ? '#2563EB' : '#7C3AED' }}>
                  {isCust ? 'CUSTOMER' : 'SUPPLIER'}
                </Text>
              </View>
            </View>
          </View>
        );
      },
    },
    {
      key: 'type',
      title: 'Transaction Type',
      width: 140,
      render: (val: any, item: Payment) => (
        <View style={[styles.directionBadge, { backgroundColor: item.type === 'receive' ? '#DCFCE7' : '#FEE2E2' }]}>
          {item.type === 'receive' ? (
            <ArrowDownLeft size={12} color="#16A34A" style={{ marginRight: 4 }} />
          ) : (
            <ArrowUpRight size={12} color="#DC2626" style={{ marginRight: 4 }} />
          )}
          <Text style={{ fontSize: 11, fontWeight: '700', color: item.type === 'receive' ? '#16A34A' : '#DC2626' }}>
            {item.type === 'receive' ? 'RECEIVED (IN)' : 'PAID (OUT)'}
          </Text>
        </View>
      ),
    },
    {
      key: 'amount',
      title: 'Amount (₹)',
      width: 140,
      render: (val: any, item: Payment) => (
        <Text
          style={{
            fontWeight: '700',
            fontSize: 14,
            color: item.type === 'receive' ? '#16A34A' : '#DC2626',
          }}
        >
          {item.type === 'receive' ? '+' : '-'}₹{item.amount.toFixed(2)}
        </Text>
      ),
    },
    {
      key: 'method',
      title: 'Method',
      width: 110,
      render: (val: any, item: Payment) => (
        <View style={styles.methodPill}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>
            {(item.method || 'CASH').toUpperCase()}
          </Text>
        </View>
      ),
    },
    {
      key: 'createdAt',
      title: 'Date & Time',
      width: 160,
      render: (val: any, item: Payment) => {
        const d = new Date(item.createdAt);
        return (
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
            {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        );
      },
    },
    {
      key: 'notes',
      title: 'Notes',
      width: 130,
      render: (val: any, item: Payment) => (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
          {item.notes || '—'}
        </Text>
      ),
    },
    {
      key: 'syncStatus',
      title: 'Sync',
      width: 100,
      render: (val: any, item: Payment) => <SyncBadge status={item.syncStatus || 'synced'} />,
    },
  ];

  const renderRowActions = (item: Payment) => (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <Pressable
        style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}
        onPress={() => setViewedPayment(item)}
      >
        <Eye size={15} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable
        style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}
        onPress={() => handleDeletePayment(item)}
      >
        <Trash2 size={15} color={theme.colors.error} />
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 4 Metric Summary Cards */}
      <View style={styles.metricsGrid}>
        {/* Total Received (In) */}
        <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderLeftColor: '#10B981' }]}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricCardLabel}>TOTAL RECEIVED (IN)</Text>
            <View style={[styles.metricIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <ArrowDownLeft size={16} color="#16A34A" />
            </View>
          </View>
          <Text style={[styles.metricCardValue, { color: '#16A34A' }]}>
            ₹{metrics.totalIn.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={styles.metricCardSub}>From Customers: ₹{metrics.customerIn.toFixed(2)}</Text>
        </View>

        {/* Total Paid (Out) */}
        <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderLeftColor: '#EF4444' }]}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricCardLabel}>TOTAL PAID (OUT)</Text>
            <View style={[styles.metricIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <ArrowUpRight size={16} color="#DC2626" />
            </View>
          </View>
          <Text style={[styles.metricCardValue, { color: '#DC2626' }]}>
            ₹{metrics.totalOut.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={styles.metricCardSub}>To Suppliers: ₹{metrics.supplierOut.toFixed(2)}</Text>
        </View>

        {/* Net Cashflow */}
        <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderLeftColor: '#3B82F6' }]}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricCardLabel}>NET CASHFLOW</Text>
            <View style={[styles.metricIconCircle, { backgroundColor: '#DBEAFE' }]}>
              <DollarSign size={16} color="#2563EB" />
            </View>
          </View>
          <Text style={[styles.metricCardValue, { color: metrics.netCashflow >= 0 ? '#16A34A' : '#DC2626' }]}>
            {metrics.netCashflow >= 0 ? '+' : ''}₹{metrics.netCashflow.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={styles.metricCardSub}>{metrics.netCashflow >= 0 ? 'Cash Positive' : 'Cash Outflow'}</Text>
        </View>

        {/* Total Transactions */}
        <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderLeftColor: '#8B5CF6' }]}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricCardLabel}>ALL TRANSACTIONS</Text>
            <View style={[styles.metricIconCircle, { backgroundColor: '#EDE9FE' }]}>
              <CreditCard size={16} color="#7C3AED" />
            </View>
          </View>
          <Text style={[styles.metricCardValue, { color: '#7C3AED' }]}>
            {metrics.totalTransactions}
          </Text>
          <Text style={styles.metricCardSub}>{metrics.inCount} In / {metrics.outCount} Out</Text>
        </View>
      </View>

      {/* Main Table View */}
      <View style={styles.tableFlex}>
        <AdvancedTable
          title={customerId ? 'Customer Payment Records' : 'Payment Transactions'}
          subtitle="Complete log of customer receipts and supplier payments"
          headerActions={headerActions}
          columns={columns}
          data={filteredPayments}
          onSearch={setSearchQuery}
          filters={filterToolbar}
          renderRowActions={renderRowActions}
          isLoading={loading}
        />
      </View>

      {/* Add / Receive Payment Popup Modal */}
      <PaymentFormModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        onSuccess={loadData}
        initialEntityType={modalInitialEntityType}
        initialPaymentType={modalInitialPaymentType}
        entityId={customerId || supplierId}
      />

      {/* View Payment Voucher Details Dialog */}
      {viewedPayment && (
        <AppDialog
          visible={!!viewedPayment}
          title="Payment Voucher Details"
          onClose={() => setViewedPayment(null)}
          actions={
            <TouchableOpacity
              style={styles.dialogCloseBtn}
              onPress={() => setViewedPayment(null)}
            >
              <Text style={styles.dialogCloseBtnText}>Close</Text>
            </TouchableOpacity>
          }
        >
          <View style={styles.dialogBody}>
            <View style={styles.dialogHeaderBox}>
              <View style={[styles.directionBadge, { backgroundColor: viewedPayment.type === 'receive' ? '#DCFCE7' : '#FEE2E2', alignSelf: 'flex-start' }]}>
                {viewedPayment.type === 'receive' ? (
                  <ArrowDownLeft size={14} color="#16A34A" style={{ marginRight: 4 }} />
                ) : (
                  <ArrowUpRight size={14} color="#DC2626" style={{ marginRight: 4 }} />
                )}
                <Text style={{ fontSize: 12, fontWeight: '700', color: viewedPayment.type === 'receive' ? '#16A34A' : '#DC2626' }}>
                  {viewedPayment.type === 'receive' ? 'MONEY RECEIVED' : 'PAYMENT PAID'}
                </Text>
              </View>

              <Text style={[styles.dialogAmount, { color: viewedPayment.type === 'receive' ? '#16A34A' : '#DC2626' }]}>
                ₹{viewedPayment.amount.toFixed(2)}
              </Text>
            </View>

            <View style={styles.dialogGrid}>
              <View style={styles.dialogRow}>
                <Text style={styles.dialogLabel}>Party Name:</Text>
                <Text style={styles.dialogVal}>
                  {viewedPayment.customerId
                    ? customerMap[viewedPayment.customerId]?.name || 'Customer'
                    : viewedPayment.supplierId
                    ? supplierMap[viewedPayment.supplierId]?.name || 'Supplier'
                    : 'General'}
                </Text>
              </View>

              <View style={styles.dialogRow}>
                <Text style={styles.dialogLabel}>Party Type:</Text>
                <Text style={styles.dialogVal}>{viewedPayment.customerId ? 'Customer' : 'Supplier'}</Text>
              </View>

              <View style={styles.dialogRow}>
                <Text style={styles.dialogLabel}>Payment Method:</Text>
                <Text style={styles.dialogVal}>{viewedPayment.method?.toUpperCase()}</Text>
              </View>

              <View style={styles.dialogRow}>
                <Text style={styles.dialogLabel}>Reference ID:</Text>
                <Text style={styles.dialogVal}>{viewedPayment.reference || '—'}</Text>
              </View>

              <View style={styles.dialogRow}>
                <Text style={styles.dialogLabel}>Date & Time:</Text>
                <Text style={styles.dialogVal}>{new Date(viewedPayment.createdAt).toLocaleString()}</Text>
              </View>

              <View style={styles.dialogRow}>
                <Text style={styles.dialogLabel}>Sync Status:</Text>
                <SyncBadge status={viewedPayment.syncStatus || 'synced'} />
              </View>

              {viewedPayment.notes ? (
                <View style={[styles.dialogRow, { flexDirection: 'column', alignItems: 'flex-start', marginTop: 6 }]}>
                  <Text style={styles.dialogLabel}>Notes:</Text>
                  <Text style={[styles.dialogVal, { marginTop: 2, fontStyle: 'italic' }]}>{viewedPayment.notes}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </AppDialog>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  metricIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricCardValue: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricCardSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  tableFlex: {
    flex: 1,
  },
  headerActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  backOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: 'white',
    gap: 6,
  },
  backOutlineText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 6,
    gap: 6,
  },
  actionBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  segmentBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  dropdownWrap: {
    position: 'relative',
    zIndex: 10,
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 36,
    backgroundColor: 'white',
  },
  filterDropdownText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    left: 0,
    width: 140,
    backgroundColor: 'white',
    borderWidth: 1,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  partyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  methodPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  rowActionBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  dialogCloseBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
  },
  dialogCloseBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  dialogBody: {
    paddingVertical: 4,
  },
  dialogHeaderBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dialogAmount: {
    fontSize: 22,
    fontWeight: '800',
  },
  dialogGrid: {
    gap: 10,
  },
  dialogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dialogLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  dialogVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
});
