import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { ReportsService, ReportFilters } from '../services/reports.service';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import {
  UserCheck,
  Search,
  CheckCircle,
  AlertTriangle,
  ShoppingBag,
  DollarSign,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  X,
  Download,
} from 'lucide-react-native';

interface SupplierWiseReportViewProps {
  filters: ReportFilters;
  dateRangeLabel: string;
  selectedSupplierId?: number | string | null;
  onSelectSupplier?: (supplierId: number | string | null) => void;
  onOpenExport?: () => void;
}

export const SupplierWiseReportView: React.FC<SupplierWiseReportViewProps> = ({
  filters,
  dateRangeLabel,
  selectedSupplierId: propSupplierId,
  onSelectSupplier,
  onOpenExport,
}) => {
  const theme = useTheme();

  // Internal supplier selection state
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | string | null>(
    propSupplierId || null
  );

  // Data states
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

  // Statement data for selected supplier
  const [statementData, setStatementData] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<'bills' | 'payments'>('bills');
  const [transactionSearchQuery, setTransactionSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Overview data for "All Suppliers"
  const [allSuppliersData, setAllSuppliersData] = useState<any[]>([]);

  // Sync prop changes
  useEffect(() => {
    if (propSupplierId !== undefined) {
      setSelectedSupplierId(propSupplierId);
    }
  }, [propSupplierId]);

  // Load supplier directory
  useEffect(() => {
    const fetchSuppliers = async () => {
      const list = await ReportsService.getAllSuppliersList();
      setSuppliersList(list);
    };
    fetchSuppliers();
  }, []);

  // Fetch data depending on whether a supplier is selected or all
  const loadData = async () => {
    setIsLoading(true);
    try {
      if (selectedSupplierId) {
        const stmt = await ReportsService.getSupplierWiseStatement(selectedSupplierId, filters);
        setStatementData(stmt);
      } else {
        const res = await ReportsService.getSupplierReport(filters);
        setAllSuppliersData(res);
      }
    } catch (err) {
      console.error('Error loading supplier-wise report', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSupplierId, filters.startDate, filters.endDate]);

  const handleChooseSupplier = (id: number | string | null) => {
    setSelectedSupplierId(id);
    setIsSupplierDropdownOpen(false);
    setTransactionSearchQuery('');
    if (onSelectSupplier) {
      onSelectSupplier(id);
    }
  };

  // Filtered supplier list for dropdown
  const filteredSupplierOptions = useMemo(() => {
    if (!supplierSearchQuery.trim()) return suppliersList;
    const q = supplierSearchQuery.toLowerCase().trim();
    return suppliersList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        (s.contactName && s.contactName.toLowerCase().includes(q)) ||
        (s.supplierCode && s.supplierCode.toLowerCase().includes(q))
    );
  }, [suppliersList, supplierSearchQuery]);

  // Filtered bills for selected supplier
  const filteredBills = useMemo(() => {
    if (!statementData?.purchases) return [];
    if (!transactionSearchQuery.trim()) return statementData.purchases;
    const q = transactionSearchQuery.toLowerCase().trim();
    return statementData.purchases.filter(
      (p: any) =>
        p.invoiceNumber.toLowerCase().includes(q) ||
        String(p.total).includes(q) ||
        (p.paymentStatus && p.paymentStatus.toLowerCase().includes(q)) ||
        (p.status && p.status.toLowerCase().includes(q)) ||
        (p.date && p.date.includes(q))
    );
  }, [statementData, transactionSearchQuery]);

  // Filtered payments for selected supplier
  const filteredPayments = useMemo(() => {
    if (!statementData?.payments) return [];
    if (!transactionSearchQuery.trim()) return statementData.payments;
    const q = transactionSearchQuery.toLowerCase().trim();
    return statementData.payments.filter(
      (p: any) =>
        p.voucherNo.toLowerCase().includes(q) ||
        String(p.amount).includes(q) ||
        (p.paymentMethod && p.paymentMethod.toLowerCase().includes(q)) ||
        (p.reference && p.reference.toLowerCase().includes(q))
    );
  }, [statementData, transactionSearchQuery]);

  // Filtered all suppliers overview
  const filteredAllSuppliers = useMemo(() => {
    if (!supplierSearchQuery.trim()) return allSuppliersData;
    const q = supplierSearchQuery.toLowerCase().trim();
    return allSuppliersData.filter(
      (s: any) =>
        (s.supplierName || s.name || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q) ||
        (s.supplierCode && s.supplierCode.toLowerCase().includes(q))
    );
  }, [allSuppliersData, supplierSearchQuery]);

  const renderStatusBadge = (status: string) => {
    const raw = (status && String(status).trim()) || 'Clear';
    const s = raw.toUpperCase();
    if (s === 'CLEAR' || s === 'PAID' || s === 'RECEIVED') {
      return (
        <View style={[styles.badge, { backgroundColor: '#ECFDF5' }]}>
          <View style={[styles.badgeDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.badgeText, { color: '#10B981' }]}>{raw}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, { backgroundColor: '#FEF2F2' }]}>
        <View style={[styles.badgeDot, { backgroundColor: '#EF4444' }]} />
        <Text style={[styles.badgeText, { color: '#EF4444' }]}>{raw}</Text>
      </View>
    );
  };

  // If a single supplier is selected
  if (selectedSupplierId && statementData?.supplier) {
    const supp = statementData.supplier;
    const summ = statementData.summary || {
      totalOrders: 0,
      totalPurchased: 0,
      totalPaid: 0,
      totalDue: 0,
      outstandingBalance: 0,
    };

    return (
      <View style={styles.container}>
        {/* Top Breadcrumb Bar */}
        <View style={[styles.headerBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.breadcrumbRow}>
            <Pressable
              style={styles.backBtn}
              onPress={() => handleChooseSupplier(null)}
            >
              <ArrowLeft size={16} color={theme.colors.primary} />
              <Text style={[styles.backBtnText, { color: theme.colors.primary }]}>All Suppliers</Text>
            </Pressable>
            <ChevronRight size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.breadcrumbCurrent, { color: theme.colors.text }]}>
              {supp.name}
            </Text>
          </View>

          <View style={styles.rightActionsRow}>
            {onOpenExport && (
              <Pressable
                style={[styles.exportBtn, { borderColor: theme.colors.border }]}
                onPress={onOpenExport}
              >
                <Download size={14} color={theme.colors.text} />
                <Text style={[styles.exportBtnText, { color: theme.colors.text }]}>Export Statement</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Supplier Profile Banner */}
        <View style={[styles.supplierBanner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.bannerLeft}>
            <View style={[styles.avatarBox, { backgroundColor: '#F5F3FF' }]}>
              <UserCheck size={24} color="#7C3AED" />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.supplierName, { color: theme.colors.text }]}>{supp.name}</Text>
                {renderStatusBadge(summ.outstandingBalance > 0 ? 'Pending' : 'Clear')}
              </View>
              <Text style={[styles.supplierSub, { color: theme.colors.textSecondary }]}>
                ID: {supp.supplierCode || 'SU-' + supp.id} • Phone: {supp.phone || 'N/A'} • Contact: {supp.contactName || 'Primary Agent'}
              </Text>
              {supp.address ? (
                <Text style={[styles.supplierSub, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                  Address: {supp.address}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* 4 Metric Cards */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#EFF6FF' }]}>
              <ShoppingBag size={18} color="#2563EB" />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Purchase Orders</Text>
              <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{summ.totalOrders}</Text>
              <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>{dateRangeLabel}</Text>
            </View>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#ECFDF5' }]}>
              <TrendingUp size={18} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Purchased</Text>
              <Text style={[styles.kpiValue, { color: theme.colors.text }]}>₹{Number(summ.totalPurchased || 0).toLocaleString()}</Text>
              <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>Gross procurement</Text>
            </View>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#F0FDF4' }]}>
              <CheckCircle size={18} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Disbursed Paid</Text>
              <Text style={[styles.kpiValue, { color: '#10B981' }]}>₹{Number(summ.totalPaid || 0).toLocaleString()}</Text>
              <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>Paid to vendor</Text>
            </View>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FEF2F2' }]}>
              <AlertTriangle size={18} color="#EF4444" />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Accounts Payable Due</Text>
              <Text style={[styles.kpiValue, { color: Number(summ.outstandingBalance || 0) > 0 ? '#EF4444' : theme.colors.text }]}>
                ₹{Number(summ.outstandingBalance || 0).toLocaleString()}
              </Text>
              <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>Payables due</Text>
            </View>
          </View>
        </View>

        {/* Sub-Tab Navigation: Purchase Bills vs Payments */}
        <View style={styles.subTabsRow}>
          <Pressable
            style={[
              styles.subTabBtn,
              activeSubTab === 'bills' && [styles.subTabBtnActive, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '10' }],
            ]}
            onPress={() => setActiveSubTab('bills')}
          >
            <ShoppingBag size={15} color={activeSubTab === 'bills' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text
              style={[
                styles.subTabText,
                { color: activeSubTab === 'bills' ? theme.colors.primary : theme.colors.textSecondary },
                activeSubTab === 'bills' && styles.subTabTextActive,
              ]}
            >
              Purchase Bills ({statementData.purchases?.length || 0})
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.subTabBtn,
              activeSubTab === 'payments' && [styles.subTabBtnActive, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '10' }],
            ]}
            onPress={() => setActiveSubTab('payments')}
          >
            <DollarSign size={15} color={activeSubTab === 'payments' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text
              style={[
                styles.subTabText,
                { color: activeSubTab === 'payments' ? theme.colors.primary : theme.colors.textSecondary },
                activeSubTab === 'payments' && styles.subTabTextActive,
              ]}
            >
              Payment Outflows ({statementData.payments?.length || 0})
            </Text>
          </Pressable>
        </View>

        {/* Transaction Search Input */}
        <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Search size={16} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={
              activeSubTab === 'bills'
                ? `Search ${supp.name}'s purchase bills (e.g. PO-..., status, date)...`
                : `Search payouts by voucher #, method, or ref...`
            }
            placeholderTextColor={theme.colors.textSecondary}
            value={transactionSearchQuery}
            onChangeText={setTransactionSearchQuery}
          />
          {transactionSearchQuery ? (
            <Pressable onPress={() => setTransactionSearchQuery('')}>
              <X size={16} color={theme.colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {/* Bills Table View */}
        {activeSubTab === 'bills' ? (
          <AdvancedTable
            title={`Bills from ${supp.name}`}
            subtitle={`${dateRangeLabel} • ${filteredBills.length} procurement orders found`}
            columns={[
              { key: 'invoiceNumber', title: 'Bill / PO #', width: 140, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.text }}>{val}</Text> },
              { key: 'date', title: 'Date', width: 120, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
              { key: 'itemsCount', title: 'Items', width: 80, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>{val || 1}</Text> },
              { key: 'subtotal', title: 'Subtotal (₹)', width: 110, render: (val: number) => <Text style={{ color: theme.colors.text }}>₹{Number(val || 0).toLocaleString()}</Text> },
              { key: 'tax', title: 'Tax (₹)', width: 90, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>₹{Number(val || 0).toLocaleString()}</Text> },
              { key: 'total', title: 'Total (₹)', width: 120, render: (val: number) => <Text style={{ fontWeight: '700', color: theme.colors.text }}>₹{Number(val || 0).toLocaleString()}</Text> },
              { key: 'paid', title: 'Paid (₹)', width: 110, render: (val: number) => <Text style={{ color: '#10B981', fontWeight: '600' }}>₹{Number(val || 0).toLocaleString()}</Text> },
              { key: 'due', title: 'Due (₹)', width: 110, render: (val: number) => <Text style={{ color: Number(val) > 0 ? '#EF4444' : theme.colors.textSecondary, fontWeight: '700' }}>₹{Number(val || 0).toLocaleString()}</Text> },
              { key: 'paymentStatus', title: 'Status', width: 110, render: (val: string) => renderStatusBadge(val) },
            ]}
            data={filteredBills}
            hasCheckbox={false}
            isLoading={isLoading}
          />
        ) : (
          <AdvancedTable
            title={`Payments Disbursed to ${supp.name}`}
            subtitle={`${dateRangeLabel} • ${filteredPayments.length} payment vouchers`}
            columns={[
              { key: 'voucherNo', title: 'Voucher #', width: 130, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.text }}>{val}</Text> },
              { key: 'date', title: 'Date', width: 120, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
              { key: 'paymentMethod', title: 'Mode', width: 130, render: (val: string) => <Text style={{ color: theme.colors.text }}>{val}</Text> },
              { key: 'reference', title: 'Reference / Ref #', flex: 2, minWidth: 160, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
              { key: 'amount', title: 'Amount Paid (₹)', width: 140, render: (val: number) => <Text style={{ fontWeight: '700', color: '#EF4444' }}>-₹{Number(val || 0).toLocaleString()}</Text> },
            ]}
            data={filteredPayments}
            hasCheckbox={false}
            isLoading={isLoading}
          />
        )}
      </View>
    );
  }

  // "All Suppliers Overview" View
  const totalAllPurchased = filteredAllSuppliers.reduce((sum, s) => sum + Number(s.totalPurchased || 0), 0);
  const totalAllPaid = filteredAllSuppliers.reduce((sum, s) => sum + Number(s.totalPaid || 0), 0);
  const totalAllDue = filteredAllSuppliers.reduce((sum, s) => sum + Number(s.outstandingBalance || 0), 0);

  return (
    <View style={styles.container}>
      {/* Search & Selector Toolbar */}
      <View style={[styles.topSearchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.searchContainer}>
          <Search size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search supplier by name, phone, or ID..."
            placeholderTextColor={theme.colors.textSecondary}
            value={supplierSearchQuery}
            onChangeText={setSupplierSearchQuery}
          />
          {supplierSearchQuery ? (
            <Pressable onPress={() => setSupplierSearchQuery('')}>
              <X size={16} color={theme.colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {/* Supplier Select Dropdown Trigger */}
        <Pressable
          style={[styles.dropdownTrigger, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
          onPress={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
        >
          <UserCheck size={15} color={theme.colors.primary} />
          <Text style={[styles.dropdownTriggerText, { color: theme.colors.text }]}>
            Pick Supplier ({suppliersList.length})
          </Text>
          <ChevronRight size={14} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      {/* Supplier Pick Panel if open */}
      {isSupplierDropdownOpen && (
        <View style={[styles.supplierDropdownPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.dropdownHeader}>
            <Text style={[styles.dropdownTitle, { color: theme.colors.text }]}>Select Supplier for Statement</Text>
            <Pressable onPress={() => setIsSupplierDropdownOpen(false)}>
              <X size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
            {filteredSupplierOptions.map((s) => (
              <Pressable
                key={s.id}
                style={[styles.supplierPickItem, { borderBottomColor: theme.colors.divider }]}
                onPress={() => handleChooseSupplier(s.id)}
              >
                <View>
                  <Text style={[styles.supplierPickName, { color: theme.colors.text }]}>{s.name}</Text>
                  <Text style={[styles.supplierPickSub, { color: theme.colors.textSecondary }]}>
                    {s.supplierCode || 'SU-' + s.id} • {s.phone} {s.contactName ? `(${s.contactName})` : ''}
                  </Text>
                </View>
                <ChevronRight size={16} color={theme.colors.primary} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Overview Metric Cards */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#F5F3FF' }]}>
            <UserCheck size={18} color="#7C3AED" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Suppliers</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{filteredAllSuppliers.length}</Text>
            <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>Active vendors</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#ECFDF5' }]}>
            <TrendingUp size={18} color="#10B981" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Purchased</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>₹{totalAllPurchased.toLocaleString()}</Text>
            <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>Procurement turnover</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#F0FDF4' }]}>
            <CheckCircle size={18} color="#10B981" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Paid to Suppliers</Text>
            <Text style={[styles.kpiValue, { color: '#10B981' }]}>₹{totalAllPaid.toLocaleString()}</Text>
            <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>Disbursed payments</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#FEF2F2' }]}>
            <AlertTriangle size={18} color="#EF4444" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Accounts Payable Due</Text>
            <Text style={[styles.kpiValue, { color: '#EF4444' }]}>₹{totalAllDue.toLocaleString()}</Text>
            <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>Outstanding payables</Text>
          </View>
        </View>
      </View>

      {/* Supplier Summary Table */}
      <AdvancedTable
        title="Supplier-Wise Purchases & Payable Summary"
        subtitle={`${dateRangeLabel} • Tap any supplier row or 'View Details' to drill down`}
        columns={[
          { key: 'supplierCode', title: 'Supplier ID', width: 120, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'supplierName', title: 'Supplier Name', flex: 2, minWidth: 200, render: (val: string, item: any) => <Text style={{ fontWeight: '700', color: theme.colors.text }}>{(val && String(val).trim()) || (item.name && String(item.name).trim()) || 'Supplier'}</Text> },
          { key: 'phone', title: 'Phone', width: 140, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val || 'N/A'}</Text> },
          { key: 'totalPurchasesCount', title: 'Orders', width: 80, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'totalPurchased', title: 'Purchased (₹)', width: 130, render: (val: number) => <Text style={{ color: theme.colors.text }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'totalPaid', title: 'Paid (₹)', width: 130, render: (val: number) => <Text style={{ color: '#10B981', fontWeight: '500' }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'outstandingBalance', title: 'Payable Due (₹)', width: 130, render: (val: number) => <Text style={{ color: Number(val) > 0 ? '#EF4444' : theme.colors.textSecondary, fontWeight: '700' }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'status', title: 'Status', width: 100, render: (val: string) => renderStatusBadge(val) },
          {
            key: 'actions',
            title: 'Action',
            width: 140,
            render: (_: any, item: any) => (
              <Pressable
                style={[styles.viewLedgerBtn, { borderColor: theme.colors.primary }]}
                onPress={() => handleChooseSupplier(item.id)}
              >
                <Text style={[styles.viewLedgerBtnText, { color: theme.colors.primary }]}>View Details</Text>
                <ChevronRight size={12} color={theme.colors.primary} />
              </Pressable>
            ),
          },
        ]}
        data={filteredAllSuppliers}
        hasCheckbox={false}
        isLoading={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  headerBar: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  breadcrumbCurrent: {
    fontSize: 14,
    fontWeight: '700',
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  supplierBanner: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supplierName: {
    fontSize: 17,
    fontWeight: '700',
  },
  supplierSub: {
    fontSize: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: 180,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kpiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 11,
    marginTop: 2,
  },
  subTabsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  subTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  subTabBtnActive: {
    borderWidth: 1,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  subTabTextActive: {
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  topSearchBar: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  searchContainer: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  dropdownTriggerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  supplierDropdownPanel: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  dropdownTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  supplierPickItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  supplierPickName: {
    fontSize: 14,
    fontWeight: '600',
  },
  supplierPickSub: {
    fontSize: 12,
    marginTop: 2,
  },
  viewLedgerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  viewLedgerBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
