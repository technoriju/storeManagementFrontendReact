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
  Users,
  Search,
  CheckCircle,
  AlertTriangle,
  FileText,
  DollarSign,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  CreditCard,
  X,
  Clock,
  Printer,
  Download,
} from 'lucide-react-native';

interface CustomerWiseReportViewProps {
  filters: ReportFilters;
  dateRangeLabel: string;
  selectedCustomerId?: number | string | null;
  onSelectCustomer?: (customerId: number | string | null) => void;
  onOpenExport?: () => void;
}

export const CustomerWiseReportView: React.FC<CustomerWiseReportViewProps> = ({
  filters,
  dateRangeLabel,
  selectedCustomerId: propCustomerId,
  onSelectCustomer,
  onOpenExport,
}) => {
  const theme = useTheme();

  // Internal customer selection state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | string | null>(
    propCustomerId || null
  );

  // Data states
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Statement data for selected customer
  const [statementData, setStatementData] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'payments'>('invoices');
  const [transactionSearchQuery, setTransactionSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Overview data for "All Customers"
  const [allCustomersData, setAllCustomersData] = useState<any[]>([]);

  // Sync prop changes
  useEffect(() => {
    if (propCustomerId !== undefined) {
      setSelectedCustomerId(propCustomerId);
    }
  }, [propCustomerId]);

  // Load customer directory
  useEffect(() => {
    const fetchCustomers = async () => {
      const list = await ReportsService.getAllCustomersList();
      setCustomersList(list);
    };
    fetchCustomers();
  }, []);

  // Fetch data depending on whether a customer is selected or all
  const loadData = async () => {
    setIsLoading(true);
    try {
      if (selectedCustomerId) {
        const stmt = await ReportsService.getCustomerWiseStatement(selectedCustomerId, filters);
        setStatementData(stmt);
      } else {
        const res = await ReportsService.getCustomerReport(filters);
        setAllCustomersData(res);
      }
    } catch (err) {
      console.error('Error loading customer-wise report', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCustomerId, filters.startDate, filters.endDate]);

  const handleChooseCustomer = (id: number | string | null) => {
    setSelectedCustomerId(id);
    setIsCustomerDropdownOpen(false);
    setTransactionSearchQuery('');
    if (onSelectCustomer) {
      onSelectCustomer(id);
    }
  };

  // Filtered customer list for dropdown
  const filteredCustomerOptions = useMemo(() => {
    if (!customerSearchQuery.trim()) return customersList;
    const q = customerSearchQuery.toLowerCase().trim();
    return customersList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(q))
    );
  }, [customersList, customerSearchQuery]);

  // Filtered invoices for selected customer
  const filteredInvoices = useMemo(() => {
    if (!statementData?.sales) return [];
    if (!transactionSearchQuery.trim()) return statementData.sales;
    const q = transactionSearchQuery.toLowerCase().trim();
    return statementData.sales.filter(
      (s: any) =>
        s.invoiceNumber.toLowerCase().includes(q) ||
        String(s.total).includes(q) ||
        (s.paymentStatus && s.paymentStatus.toLowerCase().includes(q)) ||
        (s.date && s.date.includes(q))
    );
  }, [statementData, transactionSearchQuery]);

  // Filtered payments for selected customer
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

  // Filtered all customers overview
  const filteredAllCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return allCustomersData;
    const q = customerSearchQuery.toLowerCase().trim();
    return allCustomersData.filter(
      (c: any) =>
        (c.customerName || c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(q))
    );
  }, [allCustomersData, customerSearchQuery]);

  const renderStatusBadge = (status: string) => {
    const raw = (status && String(status).trim()) || 'Clear';
    const s = raw.toUpperCase();
    if (s === 'CLEAR' || s === 'PAID' || s === 'COMPLETED') {
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

  // If a single customer is selected
  if (selectedCustomerId && statementData?.customer) {
    const cust = statementData.customer;
    const summ = statementData.summary || {
      totalOrders: 0,
      totalBilled: 0,
      totalPaid: 0,
      totalDue: 0,
      outstandingBalance: 0,
    };

    return (
      <View style={styles.container}>
        {/* Top Breadcrumb & Customer Selector Bar */}
        <View style={[styles.headerBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.breadcrumbRow}>
            <Pressable
              style={styles.backBtn}
              onPress={() => handleChooseCustomer(null)}
            >
              <ArrowLeft size={16} color={theme.colors.primary} />
              <Text style={[styles.backBtnText, { color: theme.colors.primary }]}>All Customers</Text>
            </Pressable>
            <ChevronRight size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.breadcrumbCurrent, { color: theme.colors.text }]}>
              {cust.name}
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

        {/* Customer Profile Banner */}
        <View style={[styles.customerBanner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.bannerLeft}>
            <View style={[styles.avatarBox, { backgroundColor: '#EFF6FF' }]}>
              <Users size={24} color="#2563EB" />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.customerName, { color: theme.colors.text }]}>{cust.name}</Text>
                {renderStatusBadge(summ.outstandingBalance > 0 ? 'Overdue' : 'Clear')}
              </View>
              <Text style={[styles.customerSub, { color: theme.colors.textSecondary }]}>
                ID: {cust.customerCode || 'CU-' + cust.id} • Phone: {cust.phone || 'N/A'} • GSTIN: {cust.gstin || 'Unregistered'}
              </Text>
              {cust.address ? (
                <Text style={[styles.customerSub, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                  Address: {cust.address}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* 4 Metric Cards */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#EFF6FF' }]}>
              <FileText size={18} color="#2563EB" />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Invoices</Text>
              <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{summ.totalOrders}</Text>
              <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>{dateRangeLabel}</Text>
            </View>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#ECFDF5' }]}>
              <TrendingUp size={18} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Billed</Text>
              <Text style={[styles.kpiValue, { color: theme.colors.text }]}>₹{Number(summ.totalBilled || 0).toLocaleString()}</Text>
              <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>Invoiced sales</Text>
            </View>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#F0FDF4' }]}>
              <CheckCircle size={18} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Collections Paid</Text>
              <Text style={[styles.kpiValue, { color: '#10B981' }]}>₹{Number(summ.totalPaid || 0).toLocaleString()}</Text>
              <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>Settled payments</Text>
            </View>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FEF2F2' }]}>
              <AlertTriangle size={18} color="#EF4444" />
            </View>
            <View>
              <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Balance Due</Text>
              <Text style={[styles.kpiValue, { color: Number(summ.outstandingBalance || 0) > 0 ? '#EF4444' : theme.colors.text }]}>
                ₹{Number(summ.outstandingBalance || 0).toLocaleString()}
              </Text>
              <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>Receivables pending</Text>
            </View>
          </View>
        </View>

        {/* Sub-Tab Navigation: Invoices vs Payments */}
        <View style={styles.subTabsRow}>
          <Pressable
            style={[
              styles.subTabBtn,
              activeSubTab === 'invoices' && [styles.subTabBtnActive, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '10' }],
            ]}
            onPress={() => setActiveSubTab('invoices')}
          >
            <FileText size={15} color={activeSubTab === 'invoices' ? theme.colors.primary : theme.colors.textSecondary} />
            <Text
              style={[
                styles.subTabText,
                { color: activeSubTab === 'invoices' ? theme.colors.primary : theme.colors.textSecondary },
                activeSubTab === 'invoices' && styles.subTabTextActive,
              ]}
            >
              Sales Invoices ({statementData.sales?.length || 0})
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
              Payment Receipts ({statementData.payments?.length || 0})
            </Text>
          </Pressable>
        </View>

        {/* Transaction Search Input */}
        <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Search size={16} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={
              activeSubTab === 'invoices'
                ? `Search ${cust.name}'s invoices (e.g. INV-..., status, date)...`
                : `Search payments by voucher #, method, or ref...`
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

        {/* Invoices Table View */}
        {activeSubTab === 'invoices' ? (
          <AdvancedTable
            title={`Invoices for ${cust.name}`}
            subtitle={`${dateRangeLabel} • ${filteredInvoices.length} invoices found`}
            columns={[
              { key: 'invoiceNumber', title: 'Invoice #', width: 140, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.text }}>{val}</Text> },
              { key: 'date', title: 'Date', width: 120, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
              { key: 'subtotal', title: 'Subtotal (₹)', width: 110, render: (val: number) => <Text style={{ color: theme.colors.text }}>₹{Number(val || 0).toLocaleString()}</Text> },
              { key: 'tax', title: 'GST (₹)', width: 90, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>₹{Number(val || 0).toLocaleString()}</Text> },
              { key: 'discount', title: 'Discount', width: 90, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>₹{Number(val || 0).toLocaleString()}</Text> },
              { key: 'total', title: 'Grand Total', width: 120, render: (val: number) => <Text style={{ fontWeight: '700', color: theme.colors.text }}>₹{Number(val || 0).toLocaleString()}</Text> },
              { key: 'paid', title: 'Paid (₹)', width: 110, render: (val: number) => <Text style={{ color: '#10B981', fontWeight: '600' }}>₹{Number(val || 0).toLocaleString()}</Text> },
              { key: 'due', title: 'Due (₹)', width: 110, render: (val: number) => <Text style={{ color: Number(val) > 0 ? '#EF4444' : theme.colors.textSecondary, fontWeight: '700' }}>₹{Number(val || 0).toLocaleString()}</Text> },
              { key: 'paymentStatus', title: 'Status', width: 110, render: (val: string) => renderStatusBadge(val) },
            ]}
            data={filteredInvoices}
            hasCheckbox={false}
            isLoading={isLoading}
          />
        ) : (
          <AdvancedTable
            title={`Payments Received from ${cust.name}`}
            subtitle={`${dateRangeLabel} • ${filteredPayments.length} payment receipts`}
            columns={[
              { key: 'voucherNo', title: 'Voucher #', width: 130, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.text }}>{val}</Text> },
              { key: 'date', title: 'Date', width: 120, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
              { key: 'paymentMethod', title: 'Mode', width: 130, render: (val: string) => <Text style={{ color: theme.colors.text }}>{val}</Text> },
              { key: 'reference', title: 'Reference / Ref #', flex: 2, minWidth: 160, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
              { key: 'amount', title: 'Amount Paid (₹)', width: 140, render: (val: number) => <Text style={{ fontWeight: '700', color: '#10B981' }}>+₹{Number(val || 0).toLocaleString()}</Text> },
            ]}
            data={filteredPayments}
            hasCheckbox={false}
            isLoading={isLoading}
          />
        )}
      </View>
    );
  }

  // "All Customers Overview" View
  const totalAllBilled = filteredAllCustomers.reduce((sum, c) => sum + Number(c.totalBilled || 0), 0);
  const totalAllPaid = filteredAllCustomers.reduce((sum, c) => sum + Number(c.totalPaid || 0), 0);
  const totalAllDue = filteredAllCustomers.reduce((sum, c) => sum + Number(c.outstandingBalance || 0), 0);

  return (
    <View style={styles.container}>
      {/* Search & Selector Toolbar */}
      <View style={[styles.topSearchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.searchContainer}>
          <Search size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search customer by name, mobile, or ID..."
            placeholderTextColor={theme.colors.textSecondary}
            value={customerSearchQuery}
            onChangeText={setCustomerSearchQuery}
          />
          {customerSearchQuery ? (
            <Pressable onPress={() => setCustomerSearchQuery('')}>
              <X size={16} color={theme.colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {/* Customer Select Dropdown Trigger */}
        <Pressable
          style={[styles.dropdownTrigger, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
          onPress={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
        >
          <Users size={15} color={theme.colors.primary} />
          <Text style={[styles.dropdownTriggerText, { color: theme.colors.text }]}>
            Pick Customer ({customersList.length})
          </Text>
          <ChevronRight size={14} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      {/* Customer Pick Modal/List if open */}
      {isCustomerDropdownOpen && (
        <View style={[styles.customerDropdownPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.dropdownHeader}>
            <Text style={[styles.dropdownTitle, { color: theme.colors.text }]}>Select Customer for Statement</Text>
            <Pressable onPress={() => setIsCustomerDropdownOpen(false)}>
              <X size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
            {filteredCustomerOptions.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.customerPickItem, { borderBottomColor: theme.colors.divider }]}
                onPress={() => handleChooseCustomer(c.id)}
              >
                <View>
                  <Text style={[styles.customerPickName, { color: theme.colors.text }]}>{c.name}</Text>
                  <Text style={[styles.customerPickSub, { color: theme.colors.textSecondary }]}>
                    {c.customerCode || 'CU-' + c.id} • {c.phone}
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
          <View style={[styles.kpiIconBox, { backgroundColor: '#EFF6FF' }]}>
            <Users size={18} color="#2563EB" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Customers</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{filteredAllCustomers.length}</Text>
            <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>Accounts in record</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#ECFDF5' }]}>
            <TrendingUp size={18} color="#10B981" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Billed</Text>
            <Text style={[styles.kpiValue, { color: theme.colors.text }]}>₹{totalAllBilled.toLocaleString()}</Text>
            <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>Sales turnover</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#F0FDF4' }]}>
            <CheckCircle size={18} color="#10B981" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Collections</Text>
            <Text style={[styles.kpiValue, { color: '#10B981' }]}>₹{totalAllPaid.toLocaleString()}</Text>
            <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>Total received</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#FEF2F2' }]}>
            <AlertTriangle size={18} color="#EF4444" />
          </View>
          <View>
            <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Total Receivables Due</Text>
            <Text style={[styles.kpiValue, { color: '#EF4444' }]}>₹{totalAllDue.toLocaleString()}</Text>
            <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>Outstanding balance</Text>
          </View>
        </View>
      </View>

      {/* Customer Summary Table */}
      <AdvancedTable
        title="Customer-Wise Sales & Ledger Summary"
        subtitle={`${dateRangeLabel} • Tap any customer row or 'View Statement' to drill down`}
        columns={[
          { key: 'customerCode', title: 'Customer ID', width: 120, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'customerName', title: 'Customer Name', flex: 2, minWidth: 200, render: (val: string, item: any) => <Text style={{ fontWeight: '700', color: theme.colors.text }}>{(val && String(val).trim()) || (item.name && String(item.name).trim()) || 'Customer'}</Text> },
          { key: 'phone', title: 'Phone', width: 140, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val || 'N/A'}</Text> },
          { key: 'totalSalesCount', title: 'Orders', width: 80, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'totalBilled', title: 'Total Billed (₹)', width: 130, render: (val: number) => <Text style={{ color: theme.colors.text }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'totalPaid', title: 'Total Paid (₹)', width: 130, render: (val: number) => <Text style={{ color: '#10B981', fontWeight: '500' }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'outstandingBalance', title: 'Balance Due (₹)', width: 130, render: (val: number) => <Text style={{ color: Number(val) > 0 ? '#EF4444' : theme.colors.textSecondary, fontWeight: '700' }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'status', title: 'Status', width: 100, render: (val: string) => renderStatusBadge(val) },
          {
            key: 'actions',
            title: 'Action',
            width: 140,
            render: (_: any, item: any) => (
              <Pressable
                style={[styles.viewLedgerBtn, { borderColor: theme.colors.primary }]}
                onPress={() => handleChooseCustomer(item.id)}
              >
                <Text style={[styles.viewLedgerBtnText, { color: theme.colors.primary }]}>View Details</Text>
                <ChevronRight size={12} color={theme.colors.primary} />
              </Pressable>
            ),
          },
        ]}
        data={filteredAllCustomers}
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
  customerBanner: {
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
  customerName: {
    fontSize: 17,
    fontWeight: '700',
  },
  customerSub: {
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
  customerDropdownPanel: {
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
  customerPickItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  customerPickName: {
    fontSize: 14,
    fontWeight: '600',
  },
  customerPickSub: {
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
