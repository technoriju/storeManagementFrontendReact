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
  FileText,
  FileSpreadsheet,
  Printer,
  MessageCircle,
} from 'lucide-react-native';
import { DateFilterBar, DateRangeState, computePresetDates } from './DateFilterBar';
import {
  exportReportToExcel,
  printOrSavePdfReport,
  shareReportToWhatsApp,
} from '../utils/reportExportUtils';

interface SupplierWiseReportViewProps {
  filters: ReportFilters;
  dateRangeLabel: string;
  dateRange?: DateRangeState;
  onChangeDateRange?: (range: DateRangeState) => void;
  selectedSupplierId?: number | string | null;
  onSelectSupplier?: (supplierId: number | string | null) => void;
  onOpenExport?: () => void;
}

export const SupplierWiseReportView: React.FC<SupplierWiseReportViewProps> = ({
  filters,
  dateRangeLabel: propDateRangeLabel,
  dateRange: propDateRange,
  onChangeDateRange,
  selectedSupplierId: propSupplierId,
  onSelectSupplier,
  onOpenExport,
}) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  // Internal supplier selection state
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | string | null>(
    propSupplierId || null
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
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [dropdownSearchQuery, setDropdownSearchQuery] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

  // Statement data for selected supplier
  const [statementData, setStatementData] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<'bills' | 'payments'>('bills');
  const [transactionSearchQuery, setTransactionSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Overview data for "All Suppliers"
  const [allSuppliersData, setAllSuppliersData] = useState<any[]>([]);
  const [overviewPage, setOverviewPage] = useState(1);
  const [overviewRowsPerPage, setOverviewRowsPerPage] = useState(10);
  const [overviewTotalItems, setOverviewTotalItems] = useState(0);
  const [overviewTotalPages, setOverviewTotalPages] = useState(1);
  const [overviewSummary, setOverviewSummary] = useState<any>(null);

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
  const loadData = async (targetPage = overviewPage, targetLimit = overviewRowsPerPage, targetSearch = supplierSearchQuery) => {
    setIsLoading(true);
    try {
      const activeFilters: ReportFilters = {
        ...filters,
        startDate: activeDateRange.startDate,
        endDate: activeDateRange.endDate,
      };

      if (selectedSupplierId) {
        const stmt = await ReportsService.getSupplierWiseStatement(selectedSupplierId, activeFilters);
        setStatementData(stmt);
      } else {
        const res = await ReportsService.getSupplierReport({
          ...activeFilters,
          page: targetPage,
          limit: targetLimit,
          search: targetSearch.trim() || undefined,
        });
        setAllSuppliersData(res.data);
        setOverviewTotalItems(res.total);
        setOverviewTotalPages(res.totalPages);
        setOverviewSummary(res.summary);
      }
    } catch (err) {
      console.error('Error loading supplier-wise report', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(overviewPage, overviewRowsPerPage, supplierSearchQuery);
  }, [selectedSupplierId, activeDateRange.startDate, activeDateRange.endDate, overviewPage, overviewRowsPerPage, supplierSearchQuery]);

  const handleChooseSupplier = (id: number | string | null) => {
    setSelectedSupplierId(id);
    setIsSupplierDropdownOpen(false);
    setTransactionSearchQuery('');
    setOverviewPage(1);
    if (onSelectSupplier) {
      onSelectSupplier(id);
    }
  };

  // Filtered supplier list for dropdown
  const filteredSupplierOptions = useMemo(() => {
    if (!dropdownSearchQuery.trim()) return suppliersList;
    const q = dropdownSearchQuery.toLowerCase().trim();
    return suppliersList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        (s.contactName && s.contactName.toLowerCase().includes(q)) ||
        (s.supplierCode && s.supplierCode.toLowerCase().includes(q))
    );
  }, [suppliersList, dropdownSearchQuery]);

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
            <Pressable
              style={[styles.outlineActionBtn, { borderColor: theme.colors.border }]}
              onPress={() => {
                printOrSavePdfReport({
                  title: `Supplier Statement - ${supp.name}`,
                  dateRangeLabel,
                  columns: [
                    { key: 'invoiceNumber', title: 'Bill / PO #' },
                    { key: 'date', title: 'Date' },
                    { key: 'total', title: 'Total (₹)' },
                    { key: 'paid', title: 'Paid (₹)' },
                    { key: 'due', title: 'Due (₹)' },
                    { key: 'paymentStatus', title: 'Status' },
                  ],
                  data: filteredBills,
                  summary: summ,
                  partyName: supp.name,
                  phone: supp.phone,
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
                  title: `Supplier Statement - ${supp.name}`,
                  dateRangeLabel,
                  columns: [
                    { key: 'invoiceNumber', title: 'Bill / PO #' },
                    { key: 'date', title: 'Date' },
                    { key: 'total', title: 'Total (₹)' },
                    { key: 'paid', title: 'Paid (₹)' },
                    { key: 'due', title: 'Due (₹)' },
                    { key: 'paymentStatus', title: 'Status' },
                  ],
                  data: filteredBills,
                  summary: summ,
                  partyName: supp.name,
                  phone: supp.phone,
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
                  title: `Supplier Statement - ${supp.name}`,
                  dateRangeLabel,
                  columns: [
                    { key: 'invoiceNumber', title: 'Bill / PO #' },
                    { key: 'date', title: 'Date' },
                    { key: 'total', title: 'Total (₹)' },
                    { key: 'paid', title: 'Paid (₹)' },
                    { key: 'due', title: 'Due (₹)' },
                    { key: 'paymentStatus', title: 'Status' },
                  ],
                  data: filteredBills,
                  summary: summ,
                  partyName: supp.name,
                  phone: supp.phone,
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
                  title: `Supplier Statement - ${supp.name}`,
                  dateRangeLabel,
                  columns: [
                    { key: 'invoiceNumber', title: 'Bill / PO #' },
                    { key: 'date', title: 'Date' },
                    { key: 'total', title: 'Total (₹)' },
                    { key: 'paid', title: 'Paid (₹)' },
                    { key: 'due', title: 'Due (₹)' },
                    { key: 'paymentStatus', title: 'Status' },
                  ],
                  data: filteredBills,
                  summary: summ,
                  partyName: supp.name,
                  phone: supp.phone,
                });
              }}
            >
              <Printer size={12} color="#FFF" />
              <Text style={styles.primaryActionText}>Print</Text>
            </Pressable>
          </View>
        </View>

        {/* Supplier Profile Banner */}
        <View style={[styles.supplierBanner, isMobile && styles.supplierBannerMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.bannerLeft}>
            <View style={[styles.avatarBox, isMobile && styles.avatarBoxMobile, { backgroundColor: '#F5F3FF' }]}>
              <UserCheck size={isMobile ? 14 : 18} color="#7C3AED" />
            </View>
            <View style={{ flexShrink: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={[styles.supplierName, isMobile && styles.supplierNameMobile, { color: theme.colors.text }]}>{supp.name}</Text>
                {renderStatusBadge(summ.outstandingBalance > 0 ? 'Pending' : 'Clear')}
              </View>
              <Text style={[styles.supplierSub, { color: theme.colors.textSecondary }]}>
                ID: {supp.supplierCode || 'SU-' + supp.id} • {supp.phone || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* 4 Metric Cards (Height reduced up to 50%) */}
        <View style={[styles.kpiGrid, isMobile && styles.kpiGridMobile]}>
          <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#EFF6FF' }]}>
              <ShoppingBag size={isMobile ? 12 : 14} color="#2563EB" />
            </View>
            <View style={{ flexShrink: 1, minWidth: 0 }}>
              <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Orders</Text>
              <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: theme.colors.text }]} numberOfLines={1}>{summ.totalOrders}</Text>
            </View>
          </View>

          <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#ECFDF5' }]}>
              <TrendingUp size={isMobile ? 12 : 14} color="#10B981" />
            </View>
            <View style={{ flexShrink: 1, minWidth: 0 }}>
              <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Purchased</Text>
              <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: theme.colors.text }]} numberOfLines={1}>₹{Number(summ.totalPurchased || 0).toLocaleString()}</Text>
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
              <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Payable Due</Text>
              <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: Number(summ.outstandingBalance || 0) > 0 ? '#EF4444' : theme.colors.text }]} numberOfLines={1}>
                ₹{Number(summ.outstandingBalance || 0).toLocaleString()}
              </Text>
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

        {/* Bills Table View */}
        {activeSubTab === 'bills' ? (
          <AdvancedTable
            title={`Bills from ${supp.name}`}
            subtitle={`${dateRangeLabel} • ${filteredBills.length} procurement orders found`}
            searchPlaceholder={`Search ${supp.name}'s purchase bills (e.g. PO-..., status, date)...`}
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
            searchValue={transactionSearchQuery}
            onSearch={setTransactionSearchQuery}
            debounceSearchMs={400}
            hasCheckbox={false}
            renderMobileCard={(item) => (
              <View style={[styles.mobileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.invoiceNumber}</Text>
                    <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>{item.date} • {item.itemsCount || 1} items</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.cardAmount, { color: theme.colors.text }]}>₹{Number(item.total || 0).toLocaleString()}</Text>
                    {renderStatusBadge(item.paymentStatus)}
                  </View>
                </View>
                <View style={[styles.cardBottomRow, { borderTopColor: theme.colors.divider }]}>
                  <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>Tax: ₹{Number(item.tax || 0).toLocaleString()}</Text>
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
            title={`Payments Disbursed to ${supp.name}`}
            subtitle={`${dateRangeLabel} • ${filteredPayments.length} payment vouchers`}
            searchPlaceholder="Search payouts by voucher #, method, or ref..."
            columns={[
              { key: 'voucherNo', title: 'Voucher #', width: 130, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.text }}>{val}</Text> },
              { key: 'date', title: 'Date', width: 120, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
              { key: 'paymentMethod', title: 'Mode', width: 130, render: (val: string) => <Text style={{ color: theme.colors.text }}>{val}</Text> },
              { key: 'reference', title: 'Reference / Ref #', flex: 2, minWidth: 160, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
              { key: 'amount', title: 'Amount Paid (₹)', width: 140, render: (val: number) => <Text style={{ fontWeight: '700', color: '#EF4444' }}>-₹{Number(val || 0).toLocaleString()}</Text> },
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
                  <Text style={[styles.cardAmount, { color: '#EF4444' }]}>-₹{Number(item.amount || 0).toLocaleString()}</Text>
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

  // "All Suppliers Overview" View
  const totalAllCount = overviewTotalItems || filteredAllSuppliers.length;
  const totalAllPurchased = totalAllCount === 0 ? 0 : (overviewSummary?.totalPurchased ?? filteredAllSuppliers.reduce((sum, s) => sum + Number(s.totalPurchased || 0), 0));
  const totalAllPaid = totalAllCount === 0 ? 0 : (overviewSummary?.totalPaid ?? filteredAllSuppliers.reduce((sum, s) => sum + Number(s.totalPaid || 0), 0));
  const totalAllDue = totalAllCount === 0 ? 0 : (overviewSummary?.totalOutstanding ?? filteredAllSuppliers.reduce((sum, s) => sum + Number(s.outstandingBalance || 0), 0));

  return (
    <View style={styles.container}>
      {/* Overview Metric Cards (Height reduced up to 50%) */}
      <View style={[styles.kpiGrid, isMobile && styles.kpiGridMobile]}>
        <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#F5F3FF' }]}>
            <UserCheck size={isMobile ? 12 : 14} color="#7C3AED" />
          </View>
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Suppliers</Text>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: theme.colors.text }]}>{totalAllCount}</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#ECFDF5' }]}>
            <TrendingUp size={isMobile ? 12 : 14} color="#10B981" />
          </View>
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Total Purchased</Text>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: theme.colors.text }]}>₹{totalAllPurchased.toLocaleString()}</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#F0FDF4' }]}>
            <CheckCircle size={isMobile ? 12 : 14} color="#10B981" />
          </View>
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Paid to Suppliers</Text>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: '#10B981' }]}>₹{totalAllPaid.toLocaleString()}</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, isMobile && styles.kpiCardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.kpiIconBox, isMobile && styles.kpiIconBoxMobile, { backgroundColor: '#FEF2F2' }]}>
            <AlertTriangle size={isMobile ? 12 : 14} color="#EF4444" />
          </View>
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Text style={[styles.kpiLabel, isMobile && styles.kpiLabelMobile, { color: theme.colors.textSecondary }]} numberOfLines={1}>Payable Due</Text>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: '#EF4444' }]}>₹{totalAllDue.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* Supplier Pick Panel if open */}
      {isSupplierDropdownOpen && (
        <View style={[styles.supplierDropdownPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 12 }]}>
          <View style={styles.dropdownHeader}>
            <Text style={[styles.dropdownTitle, { color: theme.colors.text }]}>Select Supplier for Statement</Text>
            <Pressable onPress={() => setIsSupplierDropdownOpen(false)}>
              <X size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          <View style={[styles.dropdownSearchBox, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
            <Search size={14} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.dropdownSearchInput, { color: theme.colors.text }]}
              placeholder="Search supplier list..."
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
            {filteredSupplierOptions.map((s) => (
              <Pressable
                key={s.id}
                style={[styles.supplierPickItem, { borderBottomColor: theme.colors.divider }]}
                onPress={() => {
                  handleChooseSupplier(s.id);
                  setDropdownSearchQuery('');
                }}
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

      {/* Supplier Summary Table */}
      <AdvancedTable
        title="Supplier-Wise Summary"
        subtitle={`${dateRangeLabel} • ${totalAllCount} active vendors`}
        searchPlaceholder="Search supplier by name, phone, or ID..."
        headerActions={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Pressable
              style={[styles.outlineActionBtn, { borderColor: theme.colors.primary, backgroundColor: '#F5F3FF' }]}
              onPress={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
            >
              <UserCheck size={12} color={theme.colors.primary} />
              <Text style={[styles.outlineActionText, { color: theme.colors.primary, fontWeight: '600' }]}>
                Pick Supplier ({suppliersList.length})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.outlineActionBtn, { borderColor: theme.colors.border }]}
              onPress={() => {
                printOrSavePdfReport({
                  title: 'Supplier-Wise Report',
                  dateRangeLabel,
                  columns: [
                    { key: 'supplierCode', title: 'Supplier ID' },
                    { key: 'supplierName', title: 'Supplier Name' },
                    { key: 'phone', title: 'Phone' },
                    { key: 'totalPurchasesCount', title: 'Orders' },
                    { key: 'totalPurchased', title: 'Purchased (₹)' },
                    { key: 'totalPaid', title: 'Paid (₹)' },
                    { key: 'outstandingBalance', title: 'Due (₹)' },
                  ],
                  data: filteredAllSuppliers,
                  summary: overviewSummary || { totalPurchased: totalAllPurchased, totalPaid: totalAllPaid, totalOutstanding: totalAllDue },
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
                  title: 'Supplier-Wise Report',
                  dateRangeLabel,
                  columns: [
                    { key: 'supplierCode', title: 'Supplier ID' },
                    { key: 'supplierName', title: 'Supplier Name' },
                    { key: 'phone', title: 'Phone' },
                    { key: 'totalPurchasesCount', title: 'Orders' },
                    { key: 'totalPurchased', title: 'Purchased (₹)' },
                    { key: 'totalPaid', title: 'Paid (₹)' },
                    { key: 'outstandingBalance', title: 'Due (₹)' },
                  ],
                  data: filteredAllSuppliers,
                  summary: overviewSummary || { totalPurchased: totalAllPurchased, totalPaid: totalAllPaid, totalOutstanding: totalAllDue },
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
                  title: 'Supplier-Wise Report',
                  dateRangeLabel,
                  columns: [
                    { key: 'supplierCode', title: 'Supplier ID' },
                    { key: 'supplierName', title: 'Supplier Name' },
                    { key: 'totalPurchased', title: 'Purchased (₹)' },
                    { key: 'totalPaid', title: 'Paid (₹)' },
                    { key: 'outstandingBalance', title: 'Due (₹)' },
                  ],
                  data: filteredAllSuppliers,
                  summary: overviewSummary || { totalPurchased: totalAllPurchased, totalPaid: totalAllPaid, totalOutstanding: totalAllDue },
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
                  title: 'Supplier-Wise Report',
                  dateRangeLabel,
                  columns: [
                    { key: 'supplierCode', title: 'Supplier ID' },
                    { key: 'supplierName', title: 'Supplier Name' },
                    { key: 'phone', title: 'Phone' },
                    { key: 'totalPurchasesCount', title: 'Orders' },
                    { key: 'totalPurchased', title: 'Purchased (₹)' },
                    { key: 'totalPaid', title: 'Paid (₹)' },
                    { key: 'outstandingBalance', title: 'Due (₹)' },
                  ],
                  data: filteredAllSuppliers,
                  summary: overviewSummary || { totalPurchased: totalAllPurchased, totalPaid: totalAllPaid, totalOutstanding: totalAllDue },
                });
              }}
            >
              <Printer size={12} color="#FFF" />
              <Text style={styles.primaryActionText}>Print</Text>
            </Pressable>
          </View>
        }
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
        searchValue={supplierSearchQuery}
        onSearch={(text) => {
          setSupplierSearchQuery(text);
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
            onPress={() => handleChooseSupplier(item.id)}
          >
            <View style={styles.cardTopRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
                  {(item.supplierName && String(item.supplierName).trim()) || (item.name && String(item.name).trim()) || 'Supplier'}
                </Text>
                <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
                  {item.supplierCode || 'SU-' + item.id} • {item.phone || 'No phone'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.cardAmount, { color: Number(item.outstandingBalance) > 0 ? '#EF4444' : theme.colors.text }]}>
                  ₹{Number(item.outstandingBalance || 0).toLocaleString()}
                </Text>
                <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>Payable</Text>
              </View>
            </View>
            <View style={[styles.cardBottomRow, { borderTopColor: theme.colors.divider }]}>
              <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                Bought: ₹{Number(item.totalPurchased || 0).toLocaleString()} • Paid: ₹{Number(item.totalPaid || 0).toLocaleString()}
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
  supplierBanner: {
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
  supplierName: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  supplierSub: {
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
  supplierBannerMobile: {
    padding: 10,
    borderRadius: 8,
  },
  avatarBoxMobile: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  supplierNameMobile: {
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
