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
import { useResponsive } from '../../../shared/hooks/useResponsive';
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
  FileSpreadsheet,
  MessageCircle,
} from 'lucide-react-native';
import { DateFilterBar, DateRangeState, computePresetDates } from './DateFilterBar';
import {
  exportReportToExcel,
  exportReportToPdf,
  printOrSavePdfReport,
  shareReportToWhatsApp,
} from '../utils/reportExportUtils';

interface CustomerWiseReportViewProps {
  filters: ReportFilters;
  dateRangeLabel: string;
  dateRange?: DateRangeState;
  onChangeDateRange?: (range: DateRangeState) => void;
  selectedCustomerId?: number | string | null;
  onSelectCustomer?: (customerId: number | string | null) => void;
  onOpenExport?: () => void;
}

export const CustomerWiseReportView: React.FC<CustomerWiseReportViewProps> = ({
  filters,
  dateRangeLabel: propDateRangeLabel,
  dateRange: propDateRange,
  onChangeDateRange,
  selectedCustomerId: propCustomerId,
  onSelectCustomer,
  onOpenExport,
}) => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();

  // Internal customer selection state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | string | null>(
    propCustomerId || null
  );

  // Internal Date Range fallback
  const [internalDateRange, setInternalDateRange] = useState<DateRangeState>(() => {
    const init = computePresetDates('month');
    return {
      preset: 'month',
      startDate: init.startDate,
      endDate: init.endDate,
      label: init.label,
    };
  });

  const activeDateRange = propDateRange || internalDateRange;
  const dateRangeLabel = propDateRange?.label || propDateRangeLabel || internalDateRange.label;

  const handleDateRangeChange = (newRange: DateRangeState) => {
    if (onChangeDateRange) {
      onChangeDateRange(newRange);
    } else {
      setInternalDateRange(newRange);
    }
    setOverviewPage(1);
  };

  // Data states
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [dropdownSearchQuery, setDropdownSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Statement data for selected customer
  const [statementData, setStatementData] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'payments'>('invoices');
  const [transactionSearchQuery, setTransactionSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Overview data for "All Customers"
  const [allCustomersData, setAllCustomersData] = useState<any[]>([]);
  const [overviewPage, setOverviewPage] = useState(1);
  const [overviewRowsPerPage, setOverviewRowsPerPage] = useState(10);
  const [overviewTotalItems, setOverviewTotalItems] = useState(0);
  const [overviewTotalPages, setOverviewTotalPages] = useState(1);
  const [overviewSummary, setOverviewSummary] = useState<any>(null);

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
  const loadData = async (targetPage = overviewPage, targetLimit = overviewRowsPerPage, targetSearch = customerSearchQuery) => {
    setIsLoading(true);
    try {
      const activeFilters: ReportFilters = {
        ...filters,
        startDate: activeDateRange.startDate,
        endDate: activeDateRange.endDate,
      };

      if (selectedCustomerId) {
        const stmt = await ReportsService.getCustomerWiseStatement(selectedCustomerId, activeFilters);
        setStatementData(stmt);
      } else {
        const res = await ReportsService.getCustomerReport({
          ...activeFilters,
          page: targetPage,
          limit: targetLimit,
          search: targetSearch.trim() || undefined,
        });
        setAllCustomersData(res.data);
        setOverviewTotalItems(res.total);
        setOverviewTotalPages(res.totalPages);
        setOverviewSummary(res.summary);
      }
    } catch (err) {
      console.error('Error loading customer-wise report', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(overviewPage, overviewRowsPerPage, customerSearchQuery);
  }, [selectedCustomerId, activeDateRange.startDate, activeDateRange.endDate, overviewPage, overviewRowsPerPage, customerSearchQuery]);

  const handleChooseCustomer = (id: number | string | null) => {
    setSelectedCustomerId(id);
    setIsCustomerDropdownOpen(false);
    setTransactionSearchQuery('');
    setOverviewPage(1);
    if (onSelectCustomer) {
      onSelectCustomer(id);
    }
  };

  // Filtered customer list for dropdown
  const filteredCustomerOptions = useMemo(() => {
    if (!dropdownSearchQuery.trim()) return customersList;
    const q = dropdownSearchQuery.toLowerCase().trim();
    return customersList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(q))
    );
  }, [customersList, dropdownSearchQuery]);

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
            <Pressable
              style={[styles.outlineActionBtn, { borderColor: theme.colors.border }]}
              onPress={() => {
                exportReportToPdf({
                  title: `Customer Statement - ${cust.name}`,
                  dateRangeLabel,
                  startDate: activeDateRange.startDate,
                  endDate: activeDateRange.endDate,
                  columns: [
                    { key: 'invoiceNumber', title: 'Invoice #' },
                    { key: 'date', title: 'Date' },
                    { key: 'total', title: 'Total (₹)' },
                    { key: 'paid', title: 'Paid (₹)' },
                    { key: 'due', title: 'Due (₹)' },
                    { key: 'paymentStatus', title: 'Status' },
                  ],
                  data: filteredInvoices,
                  summary: summ,
                  partyName: cust.name,
                  phone: cust.phone,
                });
              }}
            >
              <FileText size={12} color="#EF4444" />
              <Text style={[styles.outlineActionText, { color: theme.colors.text }]}>PDF</Text>
            </Pressable>

            <Pressable
              style={[styles.outlineActionBtn, { borderColor: theme.colors.border }]}
              onPress={() => {
                exportReportToExcel({
                  title: `Customer Statement - ${cust.name}`,
                  dateRangeLabel,
                  startDate: activeDateRange.startDate,
                  endDate: activeDateRange.endDate,
                  columns: [
                    { key: 'invoiceNumber', title: 'Invoice #' },
                    { key: 'date', title: 'Date' },
                    { key: 'total', title: 'Total (₹)' },
                    { key: 'paid', title: 'Paid (₹)' },
                    { key: 'due', title: 'Due (₹)' },
                    { key: 'paymentStatus', title: 'Status' },
                  ],
                  data: filteredInvoices,
                  summary: summ,
                  partyName: cust.name,
                  phone: cust.phone,
                });
              }}
            >
              <FileSpreadsheet size={12} color="#10B981" />
              <Text style={[styles.outlineActionText, { color: theme.colors.text }]}>Excel</Text>
            </Pressable>

            <Pressable
              style={[styles.outlineActionBtn, { borderColor: '#16A34A', backgroundColor: '#DCFCE720' }]}
              onPress={() => {
                shareReportToWhatsApp({
                  title: `Customer Statement - ${cust.name}`,
                  dateRangeLabel,
                  startDate: activeDateRange.startDate,
                  endDate: activeDateRange.endDate,
                  columns: [
                    { key: 'invoiceNumber', title: 'Invoice #' },
                    { key: 'date', title: 'Date' },
                    { key: 'total', title: 'Total (₹)' },
                    { key: 'paid', title: 'Paid (₹)' },
                    { key: 'due', title: 'Due (₹)' },
                    { key: 'paymentStatus', title: 'Status' },
                  ],
                  data: filteredInvoices,
                  summary: summ,
                  partyName: cust.name,
                  phone: cust.phone,
                });
              }}
            >
              <MessageCircle size={12} color="#16A34A" />
              <Text style={[styles.outlineActionText, { color: '#16A34A' }]}>WhatsApp</Text>
            </Pressable>

            <Pressable
              style={[styles.primaryActionBtn, { backgroundColor: '#2563EB' }]}
              onPress={() => {
                printOrSavePdfReport({
                  title: `Customer Statement - ${cust.name}`,
                  dateRangeLabel,
                  startDate: activeDateRange.startDate,
                  endDate: activeDateRange.endDate,
                  columns: [
                    { key: 'invoiceNumber', title: 'Invoice #' },
                    { key: 'date', title: 'Date' },
                    { key: 'total', title: 'Total (₹)' },
                    { key: 'paid', title: 'Paid (₹)' },
                    { key: 'due', title: 'Due (₹)' },
                    { key: 'paymentStatus', title: 'Status' },
                  ],
                  data: filteredInvoices,
                  summary: summ,
                  partyName: cust.name,
                  phone: cust.phone,
                });
              }}
            >
              <Printer size={12} color="#FFF" />
              <Text style={styles.primaryActionText}>Print</Text>
            </Pressable>
          </View>
        </View>

        {/* Customer Profile Banner */}
        <View style={[styles.customerBanner, isMobile && styles.customerBannerMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.bannerLeft}>
            <View style={[styles.avatarBox, isMobile && styles.avatarBoxMobile, { backgroundColor: '#EFF6FF' }]}>
              <Users size={isMobile ? 14 : 18} color="#2563EB" />
            </View>
            <View style={{ flexShrink: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={[styles.customerName, isMobile && styles.customerNameMobile, { color: theme.colors.text }]}>{cust.name}</Text>
                {renderStatusBadge(summ.outstandingBalance > 0 ? 'Overdue' : 'Clear')}
              </View>
              <Text style={[styles.customerSub, { color: theme.colors.textSecondary }]}>
                ID: {cust.customerCode || 'CU-' + cust.id} • {cust.phone || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* 4 Metric Cards (Height reduced up to 50%) */}
        <View style={[styles.kpiGrid, isMobile && styles.kpiGridMobile]}>
          <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#EFF6FF' }]}>
              <FileText size={isMobile ? 12 : 14} color="#2563EB" />
            </View>
            <View style={{ flexShrink: 1, minWidth: 0 }}>
              <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Invoices</Text>
              <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: theme.colors.text }]} numberOfLines={1}>{summ.totalOrders}</Text>
            </View>
          </View>

          <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#ECFDF5' }]}>
              <TrendingUp size={isMobile ? 12 : 14} color="#10B981" />
            </View>
            <View style={{ flexShrink: 1, minWidth: 0 }}>
              <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Billed</Text>
              <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: theme.colors.text }]} numberOfLines={1}>₹{Number(summ.totalBilled || 0).toLocaleString()}</Text>
            </View>
          </View>

          <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#F0FDF4' }]}>
              <CheckCircle size={isMobile ? 12 : 14} color="#10B981" />
            </View>
            <View style={{ flexShrink: 1, minWidth: 0 }}>
              <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Paid</Text>
              <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: '#10B981' }]} numberOfLines={1}>₹{Number(summ.totalPaid || 0).toLocaleString()}</Text>
            </View>
          </View>

          <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#FEF2F2' }]}>
              <AlertTriangle size={isMobile ? 12 : 14} color="#EF4444" />
            </View>
            <View style={{ flexShrink: 1, minWidth: 0 }}>
              <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Due</Text>
              <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: Number(summ.outstandingBalance || 0) > 0 ? '#EF4444' : theme.colors.text }]} numberOfLines={1}>
                ₹{Number(summ.outstandingBalance || 0).toLocaleString()}
              </Text>
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

        {/* Invoices Table View */}
        {activeSubTab === 'invoices' ? (
          <AdvancedTable
            title={`Invoices for ${cust.name}`}
            subtitle={`${dateRangeLabel} • ${filteredInvoices.length} invoices found`}
            searchPlaceholder={`Search ${cust.name}'s invoices (e.g. INV-..., status, date)...`}
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
            searchValue={transactionSearchQuery}
            onSearch={setTransactionSearchQuery}
            debounceSearchMs={400}
            hasCheckbox={false}
            renderMobileCard={(item) => (
              <View style={[styles.mobileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.invoiceNumber}</Text>
                    <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>{item.date}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.cardAmount, { color: theme.colors.text }]}>₹{Number(item.total || 0).toLocaleString()}</Text>
                    {renderStatusBadge(item.paymentStatus)}
                  </View>
                </View>
                <View style={[styles.cardBottomRow, { borderTopColor: theme.colors.divider }]}>
                  <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>GST: ₹{Number(item.tax || 0).toLocaleString()}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '600' }}>Paid: ₹{Number(item.paid || 0).toLocaleString()}</Text>
                    {Number(item.due || 0) > 0 ? (
                      <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '600' }}>Due: ₹{Number(item.due || 0).toLocaleString()}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            )}
            isLoading={isLoading}
          />
        ) : (
          <AdvancedTable
            title={`Payments Received from ${cust.name}`}
            subtitle={`${dateRangeLabel} • ${filteredPayments.length} payment receipts`}
            searchPlaceholder="Search payments by voucher #, method, or ref..."
            columns={[
              { key: 'voucherNo', title: 'Voucher #', width: 130, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.text }}>{val}</Text> },
              { key: 'date', title: 'Date', width: 120, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
              { key: 'paymentMethod', title: 'Mode', width: 130, render: (val: string) => <Text style={{ color: theme.colors.text }}>{val}</Text> },
              { key: 'reference', title: 'Reference / Ref #', flex: 2, minWidth: 160, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
              { key: 'amount', title: 'Amount Paid (₹)', width: 140, render: (val: number) => <Text style={{ fontWeight: '700', color: '#10B981' }}>+₹{Number(val || 0).toLocaleString()}</Text> },
            ]}
            data={filteredPayments}
            searchValue={transactionSearchQuery}
            onSearch={setTransactionSearchQuery}
            debounceSearchMs={400}
            hasCheckbox={false}
            renderMobileCard={(item) => (
              <View style={[styles.mobileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.voucherNo}</Text>
                    <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>{item.date} • {item.paymentMethod || 'Cash'}</Text>
                  </View>
                  <Text style={[styles.cardAmount, { color: '#10B981' }]}>+₹{Number(item.amount || 0).toLocaleString()}</Text>
                </View>
                {item.reference ? (
                  <View style={[styles.cardBottomRow, { borderTopColor: theme.colors.divider }]}>
                    <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>Ref: {item.reference}</Text>
                  </View>
                ) : null}
              </View>
            )}
            isLoading={isLoading}
          />
        )}
      </View>
    );
  }

  // "All Customers Overview" View
  const totalAllCount = overviewTotalItems || filteredAllCustomers.length;
  const totalAllBilled = totalAllCount === 0 ? 0 : (overviewSummary?.totalBilled ?? filteredAllCustomers.reduce((sum, c) => sum + Number(c.totalBilled || 0), 0));
  const totalAllPaid = totalAllCount === 0 ? 0 : (overviewSummary?.totalPaid ?? filteredAllCustomers.reduce((sum, c) => sum + Number(c.totalPaid || 0), 0));
  const totalAllDue = totalAllCount === 0 ? 0 : (overviewSummary?.totalOutstanding ?? filteredAllCustomers.reduce((sum, c) => sum + Number(c.outstandingBalance || 0), 0));

  return (
    <View style={styles.container}>
      {/* Overview Metric Cards (Height reduced up to 50%) */}
      <View style={[styles.kpiGrid, isMobile && styles.kpiGridMobile]}>
        <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#EFF6FF' }]}>
            <Users size={isMobile ? 12 : 14} color="#2563EB" />
          </View>
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Customers</Text>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: theme.colors.text }]} numberOfLines={1}>{totalAllCount}</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#ECFDF5' }]}>
            <TrendingUp size={isMobile ? 12 : 14} color="#10B981" />
          </View>
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Total Billed</Text>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: theme.colors.text }]} numberOfLines={1}>₹{totalAllBilled.toLocaleString()}</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#F0FDF4' }]}>
            <CheckCircle size={isMobile ? 12 : 14} color="#10B981" />
          </View>
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Collections</Text>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: '#10B981' }]} numberOfLines={1}>₹{totalAllPaid.toLocaleString()}</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#FEF2F2' }]}>
            <AlertTriangle size={isMobile ? 12 : 14} color="#EF4444" />
          </View>
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Receivables Due</Text>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: '#EF4444' }]} numberOfLines={1}>₹{totalAllDue.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* Customer Pick Modal/List if open */}
      {isCustomerDropdownOpen && (
        <View style={[styles.customerDropdownPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 12 }]}>
          <View style={styles.dropdownHeader}>
            <Text style={[styles.dropdownTitle, { color: theme.colors.text }]}>Select Customer for Statement</Text>
            <Pressable onPress={() => setIsCustomerDropdownOpen(false)}>
              <X size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          <View style={[styles.dropdownSearchBox, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
            <Search size={14} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.dropdownSearchInput, { color: theme.colors.text }]}
              placeholder="Search customer list..."
              placeholderTextColor={theme.colors.textSecondary}
              value={dropdownSearchQuery}
              onChangeText={setDropdownSearchQuery}
            />
            {dropdownSearchQuery ? (
              <Pressable onPress={() => setDropdownSearchQuery('')}>
                <X size={14} color={theme.colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
            {filteredCustomerOptions.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.customerPickItem, { borderBottomColor: theme.colors.divider }]}
                onPress={() => {
                  handleChooseCustomer(c.id);
                  setDropdownSearchQuery('');
                }}
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

      {/* Customer Summary Table */}
      <AdvancedTable
        title="Customer-Wise Summary"
        subtitle={`${dateRangeLabel} • ${totalAllCount} registered accounts`}
        searchPlaceholder="Search customer by name, mobile, or ID..."
        headerActions={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Pressable
              style={[styles.outlineActionBtn, { borderColor: theme.colors.primary, backgroundColor: '#EFF6FF' }]}
              onPress={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
            >
              <Users size={12} color={theme.colors.primary} />
              <Text style={[styles.outlineActionText, { color: theme.colors.primary, fontWeight: '600' }]}>
                Pick Customer ({customersList.length})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.outlineActionBtn, { borderColor: theme.colors.border }]}
              onPress={() => {
                exportReportToPdf({
                  title: 'Customer-Wise Report',
                  dateRangeLabel,
                  startDate: activeDateRange.startDate,
                  endDate: activeDateRange.endDate,
                  columns: [
                    { key: 'customerCode', title: 'Customer ID' },
                    { key: 'customerName', title: 'Customer Name' },
                    { key: 'phone', title: 'Phone' },
                    { key: 'totalSalesCount', title: 'Orders' },
                    { key: 'totalBilled', title: 'Billed (₹)' },
                    { key: 'totalPaid', title: 'Paid (₹)' },
                    { key: 'outstandingBalance', title: 'Due (₹)' },
                  ],
                  data: filteredAllCustomers,
                  summary: overviewSummary || { totalBilled: totalAllBilled, totalPaid: totalAllPaid, totalOutstanding: totalAllDue },
                });
              }}
            >
              <FileText size={12} color="#EF4444" />
              <Text style={[styles.outlineActionText, { color: theme.colors.text }]}>PDF</Text>
            </Pressable>

            <Pressable
              style={[styles.outlineActionBtn, { borderColor: theme.colors.border }]}
              onPress={() => {
                exportReportToExcel({
                  title: 'Customer-Wise Report',
                  dateRangeLabel,
                  startDate: activeDateRange.startDate,
                  endDate: activeDateRange.endDate,
                  columns: [
                    { key: 'customerCode', title: 'Customer ID' },
                    { key: 'customerName', title: 'Customer Name' },
                    { key: 'phone', title: 'Phone' },
                    { key: 'totalSalesCount', title: 'Orders' },
                    { key: 'totalBilled', title: 'Billed (₹)' },
                    { key: 'totalPaid', title: 'Paid (₹)' },
                    { key: 'outstandingBalance', title: 'Due (₹)' },
                  ],
                  data: filteredAllCustomers,
                  summary: overviewSummary || { totalBilled: totalAllBilled, totalPaid: totalAllPaid, totalOutstanding: totalAllDue },
                });
              }}
            >
              <FileSpreadsheet size={12} color="#10B981" />
              <Text style={[styles.outlineActionText, { color: theme.colors.text }]}>Excel</Text>
            </Pressable>

            <Pressable
              style={[styles.outlineActionBtn, { borderColor: '#16A34A', backgroundColor: '#DCFCE720' }]}
              onPress={() => {
                shareReportToWhatsApp({
                  title: 'Customer-Wise Report',
                  dateRangeLabel,
                  startDate: activeDateRange.startDate,
                  endDate: activeDateRange.endDate,
                  columns: [
                    { key: 'customerCode', title: 'Customer ID' },
                    { key: 'customerName', title: 'Customer Name' },
                    { key: 'totalBilled', title: 'Billed (₹)' },
                    { key: 'totalPaid', title: 'Paid (₹)' },
                    { key: 'outstandingBalance', title: 'Due (₹)' },
                  ],
                  data: filteredAllCustomers,
                  summary: overviewSummary || { totalBilled: totalAllBilled, totalPaid: totalAllPaid, totalOutstanding: totalAllDue },
                });
              }}
            >
              <MessageCircle size={12} color="#16A34A" />
              <Text style={[styles.outlineActionText, { color: '#16A34A' }]}>WhatsApp</Text>
            </Pressable>

            <Pressable
              style={[styles.primaryActionBtn, { backgroundColor: '#2563EB' }]}
              onPress={() => {
                printOrSavePdfReport({
                  title: 'Customer-Wise Report',
                  dateRangeLabel,
                  startDate: activeDateRange.startDate,
                  endDate: activeDateRange.endDate,
                  columns: [
                    { key: 'customerCode', title: 'Customer ID' },
                    { key: 'customerName', title: 'Customer Name' },
                    { key: 'phone', title: 'Phone' },
                    { key: 'totalSalesCount', title: 'Orders' },
                    { key: 'totalBilled', title: 'Billed (₹)' },
                    { key: 'totalPaid', title: 'Paid (₹)' },
                    { key: 'outstandingBalance', title: 'Due (₹)' },
                  ],
                  data: filteredAllCustomers,
                  summary: overviewSummary || { totalBilled: totalAllBilled, totalPaid: totalAllPaid, totalOutstanding: totalAllDue },
                });
              }}
            >
              <Printer size={12} color="#FFF" />
              <Text style={styles.primaryActionText}>Print</Text>
            </Pressable>
          </View>
        }
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
        searchValue={customerSearchQuery}
        onSearch={(text) => {
          setCustomerSearchQuery(text);
          setOverviewPage(1);
        }}
        debounceSearchMs={400}
        page={overviewPage}
        rowsPerPage={overviewRowsPerPage}
        totalItems={overviewTotalItems}
        totalPages={overviewTotalPages}
        onPageChange={(newPage) => setOverviewPage(newPage)}
        onRowsPerPageChange={(newRows) => {
          setOverviewRowsPerPage(newRows);
          setOverviewPage(1);
        }}
        hasCheckbox={false}
        renderMobileCard={(item) => (
          <Pressable
            style={[styles.mobileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => handleChooseCustomer(item.id)}
          >
            <View style={styles.cardTopRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
                  {(item.customerName && String(item.customerName).trim()) || (item.name && String(item.name).trim()) || 'Customer'}
                </Text>
                <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                  {item.customerCode || 'CU-' + item.id} • {item.phone || 'No phone'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.cardAmount, { color: Number(item.outstandingBalance) > 0 ? '#EF4444' : theme.colors.text }]}>
                  ₹{Number(item.outstandingBalance || 0).toLocaleString()}
                </Text>
                <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>Bal Due</Text>
              </View>
            </View>
            <View style={[styles.cardBottomRow, { borderTopColor: theme.colors.divider }]}>
              <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                Billed: ₹{Number(item.totalBilled || 0).toLocaleString()} • Paid: ₹{Number(item.totalPaid || 0).toLocaleString()}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {renderStatusBadge(item.status)}
                <ChevronRight size={14} color={theme.colors.primary} />
              </View>
            </View>
          </Pressable>
        )}
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
  dateFilterContainer: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  customerBanner: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  customerSub: {
    fontSize: 11,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    minWidth: 135,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kpiIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 13.5,
    fontWeight: '700',
    marginTop: 0,
  },
  kpiSub: {
    fontSize: 9.5,
    marginTop: 0,
  },
  outlineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  outlineActionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  primaryActionText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
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
  dropdownSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
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
  kpiGridMobile: {
    gap: 6,
  },
  kpiCardMobile: {
    minWidth: '47%',
    padding: 5,
    gap: 6,
    borderRadius: 6,
  },
  kpiIconBoxMobile: {
    width: 22,
    height: 22,
    borderRadius: 5,
  },
  kpiLabelMobile: {
    fontSize: 9,
  },
  kpiValueMobile: {
    fontSize: 12,
    marginTop: 0,
  },
  customerBannerMobile: {
    padding: 10,
    borderRadius: 8,
  },
  avatarBoxMobile: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  customerNameMobile: {
    fontSize: 15,
  },
  mobileCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 9,
    gap: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  cardAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
  },
});
