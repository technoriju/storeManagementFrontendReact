import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { ReportsService, ReportFilters } from '../services/reports.service';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { ProfitLossView } from '../components/ProfitLossView';
import { AnnualReportView } from '../components/AnnualReportView';
import { ReportExportModal } from '../components/ReportExportModal';
import { DateFilterBar, DateRangeState, computePresetDates } from '../components/DateFilterBar';
import { CustomerWiseReportView } from '../components/CustomerWiseReportView';
import { SupplierWiseReportView } from '../components/SupplierWiseReportView';
import {
  BarChart2,
  ShoppingBag,
  Filter,
  FileText,
  Users,
  UserCheck,
  Box,
  DollarSign,
  FileMinus,
  FilePlus,
  Activity,
  PieChart,
  Calendar,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Layers,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
} from 'lucide-react-native';

interface ReportsScreenProps {
  initialReport?: string;
  onNavigateReport?: (reportId: string) => void;
}

interface ReportTabConfig {
  id: string;
  label: string;
  subtitle: string;
  icon: any;
  category: 'core' | 'accounting' | 'strategic';
}

const REPORT_TABS: ReportTabConfig[] = [
  { id: 'sales_report', label: 'Sales Report', subtitle: 'Detailed customer sales register, tax invoices, and collections', icon: BarChart2, category: 'core' },
  { id: 'customer_wise', label: 'Customer-Wise', subtitle: 'Detailed customer sales register, invoices, and ledger breakdown', icon: Users, category: 'core' },
  { id: 'purchase_report', label: 'Purchase Report', subtitle: 'Procurement bills, purchase orders, and supplier payables', icon: ShoppingBag, category: 'core' },
  { id: 'supplier_wise', label: 'Supplier-Wise', subtitle: 'Detailed supplier purchase bills, payments, and payable breakdown', icon: UserCheck, category: 'core' },
  { id: 'inventory_report', label: 'Inventory Report', subtitle: 'Current stock balances, unit conversions, and inventory valuation', icon: Filter, category: 'core' },
  { id: 'customer_report', label: 'Customer Report', subtitle: 'Customer ledger, lifetime billing, and receivables due balances', icon: Users, category: 'core' },
  { id: 'supplier_report', label: 'Supplier Report', subtitle: 'Supplier ledger, total procurement, and outstanding payables', icon: UserCheck, category: 'core' },
  { id: 'product_report', label: 'Product Report', subtitle: 'SKU sales volume, revenue breakdown, margins, and profit performance', icon: Box, category: 'core' },
  { id: 'invoice_report', label: 'Invoice Report', subtitle: 'Complete invoice log with tax components and payment methods', icon: FileText, category: 'accounting' },
  { id: 'payment_report', label: 'Payment Report', subtitle: 'Cash receipts, bank disbursements, and net cash flow transactions', icon: DollarSign, category: 'accounting' },
  { id: 'expense_report', label: 'Expense Report', subtitle: 'Store operational costs, utilities, rent, salaries, and logistics', icon: FileMinus, category: 'accounting' },
  { id: 'income_report', label: 'Income Report', subtitle: 'Operating sales inflows and miscellaneous revenue sources', icon: FilePlus, category: 'accounting' },
  { id: 'tax_report', label: 'Tax Report', subtitle: 'GST output tax, input tax credit (ITC), and net GST liability', icon: Activity, category: 'accounting' },
  { id: 'profit_loss', label: 'Profit & Loss', subtitle: 'Gross revenue, cost of goods, overhead expenses, and net profit', icon: PieChart, category: 'strategic' },
  { id: 'annual_report', label: 'Annual Report', subtitle: '12-month comparative financial statement and YoY business growth', icon: Calendar, category: 'strategic' },
];

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  initialReport = 'sales_report',
  onNavigateReport,
}) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  // Normalize initial report ID
  const normalizedInitial = useMemo(() => {
    if (!initialReport || initialReport === 'reports') return 'sales_report';
    return initialReport;
  }, [initialReport]);

  const [activeReportId, setActiveReportId] = useState<string>(normalizedInitial);
  const [data, setData] = useState<any[]>([]);
  const [statementData, setStatementData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterStatus, setSelectedFilterStatus] = useState<string | undefined>(undefined);
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);

  // Dynamic Date Range Filter State
  const [dateRange, setDateRange] = useState<DateRangeState>(() => {
    const init = computePresetDates('month');
    return {
      preset: 'month',
      startDate: init.startDate,
      endDate: init.endDate,
      label: init.label,
    };
  });

  // Selected customer / supplier for direct drill-down
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | string | null>(null);

  // Sync when initialReport changes from parent / sidebar
  useEffect(() => {
    if (initialReport && initialReport !== 'reports') {
      setActiveReportId(initialReport);
    }
  }, [initialReport]);

  const dateRangeLabel = dateRange.label;

  const activeTabConfig = useMemo(() => {
    return REPORT_TABS.find((t) => t.id === activeReportId) || REPORT_TABS[0];
  }, [activeReportId]);

  // Fetch report data
  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const filters: ReportFilters = {};
      
      // Calculate date filters from dynamic dateRange state
      filters.startDate = dateRange.startDate;
      filters.endDate = dateRange.endDate;

      if (activeReportId === 'customer_wise' || activeReportId === 'supplier_wise') {
        // Handled by dedicated CustomerWiseReportView and SupplierWiseReportView
        setIsLoading(false);
        return;
      }

      switch (activeReportId) {
        case 'sales_report': {
          const res = await ReportsService.getSalesReport(filters);
          setData(res);
          break;
        }
        case 'purchase_report': {
          const res = await ReportsService.getPurchasesReport(filters);
          setData(res);
          break;
        }
        case 'inventory_report': {
          const res = await ReportsService.getInventoryReport(filters);
          setData(res);
          break;
        }
        case 'customer_report': {
          const res = await ReportsService.getCustomerReport(filters);
          setData(res);
          break;
        }
        case 'supplier_report': {
          const res = await ReportsService.getSupplierReport(filters);
          setData(res);
          break;
        }
        case 'product_report': {
          const res = await ReportsService.getProductReport(filters);
          setData(res);
          break;
        }
        case 'invoice_report': {
          const res = await ReportsService.getInvoiceReport(filters);
          setData(res);
          break;
        }
        case 'payment_report': {
          const res = await ReportsService.getPaymentReport(filters);
          setData(res);
          break;
        }
        case 'expense_report': {
          const res = await ReportsService.getExpenseReport(filters);
          setData(res);
          break;
        }
        case 'income_report': {
          const res = await ReportsService.getIncomeReport(filters);
          setData(res);
          break;
        }
        case 'tax_report': {
          const res = await ReportsService.getTaxReport(filters);
          setData(res);
          break;
        }
        case 'profit_loss': {
          const res = await ReportsService.getProfitAndLossReport(filters);
          setStatementData(res);
          break;
        }
        case 'annual_report': {
          const res = await ReportsService.getAnnualReport(filters);
          setStatementData(res);
          break;
        }
        default: {
          const res = await ReportsService.getSalesReport(filters);
          setData(res);
          break;
        }
      }
    } catch (e) {
      console.error('Error loading report', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [activeReportId, dateRange.startDate, dateRange.endDate]);

  const handleSelectTab = (tabId: string) => {
    setActiveReportId(tabId);
    setSearchQuery('');
    setSelectedFilterStatus(undefined);
    if (onNavigateReport) {
      onNavigateReport(tabId);
    }
  };

  // Client-side search and filtering
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    let items = [...data];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((item) => {
        return Object.values(item).some((val) =>
          String(val).toLowerCase().includes(q)
        );
      });
    }

    if (selectedFilterStatus) {
      items = items.filter((item) => {
        const statusVal = item.paymentStatus || item.status || item.type;
        return String(statusVal).toLowerCase() === selectedFilterStatus.toLowerCase();
      });
    }

    return items;
  }, [data, searchQuery, selectedFilterStatus]);

  // Contextual KPI cards calculation
  const reportKPIs = useMemo(() => {
    if (activeReportId === 'sales_report') {
      const totalSales = filteredData.reduce((sum, i) => sum + Number(i.total || 0), 0);
      const totalPaid = filteredData.reduce((sum, i) => sum + Number(i.paid || 0), 0);
      const totalDue = filteredData.reduce((sum, i) => sum + Number(i.due || 0), 0);
      const invoiceCount = filteredData.length;
      const avgValue = invoiceCount > 0 ? Math.round(totalSales / invoiceCount) : 0;

      return [
        { title: 'Total Sales Volume', value: `₹${totalSales.toLocaleString()}`, sub: `${invoiceCount} total invoices`, icon: DollarSign, color: '#2563EB', bg: '#EFF6FF' },
        { title: 'Collections Paid', value: `₹${totalPaid.toLocaleString()}`, sub: 'Settled receipts', icon: CheckCircle, color: '#10B981', bg: '#ECFDF5' },
        { title: 'Outstanding Due', value: `₹${totalDue.toLocaleString()}`, sub: 'Receivables pending', icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2' },
        { title: 'Avg Invoice Value', value: `₹${avgValue.toLocaleString()}`, sub: 'Per transaction', icon: TrendingUp, color: '#7C3AED', bg: '#F5F3FF' },
      ];
    }

    if (activeReportId === 'purchase_report') {
      const totalPurchase = filteredData.reduce((sum, i) => sum + Number(i.total || 0), 0);
      const totalPaid = filteredData.reduce((sum, i) => sum + Number(i.paid || 0), 0);
      const totalDue = filteredData.reduce((sum, i) => sum + Number(i.due || 0), 0);

      return [
        { title: 'Total Procurement', value: `₹${totalPurchase.toLocaleString()}`, sub: `${filteredData.length} purchase orders`, icon: ShoppingBag, color: '#2563EB', bg: '#EFF6FF' },
        { title: 'Paid to Suppliers', value: `₹${totalPaid.toLocaleString()}`, sub: 'Disbursed payments', icon: CheckCircle, color: '#10B981', bg: '#ECFDF5' },
        { title: 'Supplier Payables Due', value: `₹${totalDue.toLocaleString()}`, sub: 'Balance pending', icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2' },
        { title: 'Purchase Orders', value: String(filteredData.length), sub: 'Active vendor POs', icon: Layers, color: '#7C3AED', bg: '#F5F3FF' },
      ];
    }

    if (activeReportId === 'inventory_report') {
      const totalSKUs = filteredData.length;
      const totalUnits = filteredData.reduce((sum, i) => sum + Number(i.stockQuantity || 0), 0);
      const totalValuation = filteredData.reduce((sum, i) => sum + Number(i.stockValuation || 0), 0);
      const lowStockCount = filteredData.filter((i) => i.status === 'LOW_STOCK' || i.status === 'OUT_OF_STOCK').length;

      return [
        { title: 'Total Active SKUs', value: String(totalSKUs), sub: 'Catalogued products', icon: Box, color: '#2563EB', bg: '#EFF6FF' },
        { title: 'Stock In Hand', value: `${totalUnits} Units`, sub: 'Physical count', icon: Layers, color: '#10B981', bg: '#ECFDF5' },
        { title: 'Inventory Valuation', value: `₹${totalValuation.toLocaleString()}`, sub: 'At purchase cost', icon: DollarSign, color: '#7C3AED', bg: '#F5F3FF' },
        { title: 'Low / Out of Stock', value: String(lowStockCount), sub: 'Requires replenishment', icon: AlertTriangle, color: '#D97706', bg: '#FFFBEB' },
      ];
    }

    if (activeReportId === 'customer_report') {
      const totalCust = filteredData.length;
      const totalBilled = filteredData.reduce((sum, i) => sum + Number(i.totalBilled || 0), 0);
      const totalDue = filteredData.reduce((sum, i) => sum + Number(i.outstandingBalance || 0), 0);
      const overdueCust = filteredData.filter((i) => Number(i.outstandingBalance || 0) > 0).length;

      return [
        { title: 'Total Customers', value: String(totalCust), sub: 'Registered accounts', icon: Users, color: '#2563EB', bg: '#EFF6FF' },
        { title: 'Lifetime Billed', value: `₹${totalBilled.toLocaleString()}`, sub: 'Gross invoice volume', icon: TrendingUp, color: '#10B981', bg: '#ECFDF5' },
        { title: 'Total Receivables Due', value: `₹${totalDue.toLocaleString()}`, sub: 'Owed by buyers', icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2' },
        { title: 'Customers with Due', value: String(overdueCust), sub: 'Pending settlement', icon: Clock, color: '#D97706', bg: '#FFFBEB' },
      ];
    }

    if (activeReportId === 'supplier_report') {
      const totalSupp = filteredData.length;
      const totalPurchased = filteredData.reduce((sum, i) => sum + Number(i.totalPurchased || 0), 0);
      const totalDue = filteredData.reduce((sum, i) => sum + Number(i.outstandingBalance || 0), 0);
      const pendingSupp = filteredData.filter((i) => Number(i.outstandingBalance || 0) > 0).length;

      return [
        { title: 'Total Suppliers', value: String(totalSupp), sub: 'Active vendors', icon: UserCheck, color: '#2563EB', bg: '#EFF6FF' },
        { title: 'Total Purchased', value: `₹${totalPurchased.toLocaleString()}`, sub: 'Procurement turnover', icon: ShoppingBag, color: '#10B981', bg: '#ECFDF5' },
        { title: 'Accounts Payable Due', value: `₹${totalDue.toLocaleString()}`, sub: 'Owed to vendors', icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2' },
        { title: 'Vendors with Due', value: String(pendingSupp), sub: 'Payment pending', icon: Clock, color: '#D97706', bg: '#FFFBEB' },
      ];
    }

    if (activeReportId === 'product_report') {
      const totalRevenue = filteredData.reduce((sum, i) => sum + Number(i.revenue || 0), 0);
      const totalProfit = filteredData.reduce((sum, i) => sum + Number(i.profit || 0), 0);
      const totalUnits = filteredData.reduce((sum, i) => sum + Number(i.unitsSold || 0), 0);
      const avgMargin = totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0;

      return [
        { title: 'Total Sold Units', value: `${totalUnits} Pcs`, sub: 'Across all SKUs', icon: Box, color: '#2563EB', bg: '#EFF6FF' },
        { title: 'Product Sales Revenue', value: `₹${totalRevenue.toLocaleString()}`, sub: 'Gross merchandise value', icon: TrendingUp, color: '#10B981', bg: '#ECFDF5' },
        { title: 'Gross Product Profit', value: `₹${totalProfit.toLocaleString()}`, sub: 'Revenue minus cost', icon: DollarSign, color: '#7C3AED', bg: '#F5F3FF' },
        { title: 'Average Margin', value: `${avgMargin}%`, sub: 'Weighted gross margin', icon: ArrowUpRight, color: '#10B981', bg: '#ECFDF5' },
      ];
    }

    if (activeReportId === 'invoice_report') {
      const grandTotal = filteredData.reduce((sum, i) => sum + Number(i.grandTotal || 0), 0);
      const taxAmount = filteredData.reduce((sum, i) => sum + Number(i.taxAmount || 0), 0);
      const paidCount = filteredData.filter((i) => i.paymentStatus === 'Paid').length;
      const unpaidCount = filteredData.filter((i) => i.paymentStatus !== 'Paid').length;

      return [
        { title: 'Invoiced Amount', value: `₹${grandTotal.toLocaleString()}`, sub: `${filteredData.length} tax bills`, icon: FileText, color: '#2563EB', bg: '#EFF6FF' },
        { title: 'GST Collected', value: `₹${taxAmount.toLocaleString()}`, sub: 'Total tax component', icon: Activity, color: '#7C3AED', bg: '#F5F3FF' },
        { title: 'Paid Invoices', value: String(paidCount), sub: 'Settled receipts', icon: CheckCircle, color: '#10B981', bg: '#ECFDF5' },
        { title: 'Unpaid / Partial', value: String(unpaidCount), sub: 'Pending collection', icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2' },
      ];
    }

    if (activeReportId === 'payment_report') {
      const totalInflow = filteredData.reduce((sum, i) => sum + Number(i.inflow || 0), 0);
      const totalOutflow = filteredData.reduce((sum, i) => sum + Number(i.outflow || 0), 0);
      const netCash = totalInflow - totalOutflow;

      return [
        { title: 'Total Collections (In)', value: `₹${totalInflow.toLocaleString()}`, sub: 'Receipts from customers', icon: ArrowUpRight, color: '#10B981', bg: '#ECFDF5' },
        { title: 'Total Payouts (Out)', value: `₹${totalOutflow.toLocaleString()}`, sub: 'Vendor & expense payouts', icon: ArrowDownLeft, color: '#EF4444', bg: '#FEF2F2' },
        { title: 'Net Cash Flow', value: `₹${netCash.toLocaleString()}`, sub: 'Inflow minus outflow', icon: DollarSign, color: netCash >= 0 ? '#10B981' : '#EF4444', bg: netCash >= 0 ? '#ECFDF5' : '#FEF2F2' },
        { title: 'Total Transactions', value: String(filteredData.length), sub: 'Vouchers recorded', icon: Layers, color: '#2563EB', bg: '#EFF6FF' },
      ];
    }

    if (activeReportId === 'expense_report') {
      const totalExp = filteredData.reduce((sum, i) => sum + Number(i.amount || 0), 0);

      return [
        { title: 'Total Expenses', value: `₹${totalExp.toLocaleString()}`, sub: `${filteredData.length} cost vouchers`, icon: FileMinus, color: '#EF4444', bg: '#FEF2F2' },
        { title: 'Top Category', value: 'Rent & Facility', sub: '₹25,000 monthly', icon: PieChart, color: '#D97706', bg: '#FFFBEB' },
        { title: 'Operational Overhead', value: `₹${totalExp.toLocaleString()}`, sub: 'Direct business costs', icon: DollarSign, color: '#7C3AED', bg: '#F5F3FF' },
      ];
    }

    if (activeReportId === 'income_report') {
      const totalInc = filteredData.reduce((sum, i) => sum + Number(i.amount || 0), 0);

      return [
        { title: 'Total Inflow Recorded', value: `₹${totalInc.toLocaleString()}`, sub: `${filteredData.length} credit entries`, icon: FilePlus, color: '#10B981', bg: '#ECFDF5' },
        { title: 'Primary Source', value: 'Sales Operations', sub: 'Core store revenues', icon: TrendingUp, color: '#2563EB', bg: '#EFF6FF' },
        { title: 'Other Inflows', value: '₹10,800', sub: 'Interest & scrap sales', icon: DollarSign, color: '#7C3AED', bg: '#F5F3FF' },
      ];
    }

    if (activeReportId === 'tax_report') {
      const salesTax = filteredData.filter((i) => i.type === 'SALE').reduce((sum, i) => sum + Number(i.totalGst || 0), 0);
      const purchaseTax = filteredData.filter((i) => i.type === 'PURCHASE').reduce((sum, i) => sum + Number(i.totalGst || 0), 0);
      const netTaxPayable = Math.max(0, salesTax - purchaseTax);

      return [
        { title: 'Output GST (Sales)', value: `₹${salesTax.toLocaleString()}`, sub: 'Collected from buyers', icon: ArrowUpRight, color: '#2563EB', bg: '#EFF6FF' },
        { title: 'Input Tax Credit (ITC)', value: `₹${purchaseTax.toLocaleString()}`, sub: 'Paid to suppliers', icon: ArrowDownLeft, color: '#10B981', bg: '#ECFDF5' },
        { title: 'Net GST Payable', value: `₹${netTaxPayable.toLocaleString()}`, sub: 'Government tax liability', icon: Activity, color: '#EF4444', bg: '#FEF2F2' },
        { title: 'Tax Invoices Logged', value: String(filteredData.length), sub: 'GSTR compliance ready', icon: FileText, color: '#7C3AED', bg: '#F5F3FF' },
      ];
    }

    return [];
  }, [activeReportId, filteredData]);

  // Helper status badge renderer
  const renderStatusBadge = (status: string) => {
    const s = String(status || '').toUpperCase();
    if (s === 'PAID' || s === 'COMPLETED' || s === 'RECEIVED' || s === 'CLEAR' || s === 'IN_STOCK' || s === 'RECEIPT') {
      return (
        <View style={[styles.badge, { backgroundColor: '#ECFDF5' }]}>
          <View style={[styles.badgeDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.badgeText, { color: '#10B981' }]}>{status}</Text>
        </View>
      );
    }
    if (s === 'PARTIAL' || s === 'PENDING' || s === 'ORDERED' || s === 'LOW_STOCK') {
      return (
        <View style={[styles.badge, { backgroundColor: '#FFFBEB' }]}>
          <View style={[styles.badgeDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.badgeText, { color: '#D97706' }]}>{status}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, { backgroundColor: '#FEF2F2' }]}>
        <View style={[styles.badgeDot, { backgroundColor: '#EF4444' }]} />
        <Text style={[styles.badgeText, { color: '#EF4444' }]}>{status}</Text>
      </View>
    );
  };

  // Define table columns tailored to each report type
  const tableColumns = useMemo(() => {
    switch (activeReportId) {
      case 'sales_report':
        return [
          { key: 'invoiceNumber', title: 'Invoice #', width: 130, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.text }}>{val}</Text> },
          { key: 'date', title: 'Date', width: 110, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          {
            key: 'customerName',
            title: 'Customer',
            flex: 2,
            minWidth: 180,
            render: (val: string, item: any) => (
              <Pressable
                onPress={() => {
                  if (item.customerId) setSelectedCustomerId(item.customerId);
                  handleSelectTab('customer_wise');
                }}
              >
                <Text style={{ fontWeight: '600', color: theme.colors.primary }}>{val}</Text>
              </Pressable>
            ),
          },
          { key: 'paymentMethod', title: 'Payment Mode', width: 120, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val || 'Cash'}</Text> },
          { key: 'subtotal', title: 'Subtotal', width: 100, render: (val: number) => <Text style={{ color: theme.colors.text }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'tax', title: 'GST', width: 90, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'total', title: 'Total (₹)', width: 110, render: (val: number) => <Text style={{ fontWeight: '700', color: theme.colors.text }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'paid', title: 'Paid (₹)', width: 100, render: (val: number) => <Text style={{ color: '#10B981', fontWeight: '600' }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'due', title: 'Due (₹)', width: 100, render: (val: number) => <Text style={{ color: Number(val) > 0 ? '#EF4444' : theme.colors.textSecondary, fontWeight: '600' }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'paymentStatus', title: 'Status', width: 110, render: (val: string) => renderStatusBadge(val) },
        ];

      case 'purchase_report':
        return [
          { key: 'invoiceNumber', title: 'Bill / PO #', width: 130, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.text }}>{val}</Text> },
          { key: 'date', title: 'Date', width: 110, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          {
            key: 'supplierName',
            title: 'Supplier Name',
            flex: 2,
            minWidth: 190,
            render: (val: string, item: any) => (
              <Pressable
                onPress={() => {
                  if (item.supplierId) setSelectedSupplierId(item.supplierId);
                  handleSelectTab('supplier_wise');
                }}
              >
                <Text style={{ fontWeight: '600', color: theme.colors.primary }}>{val}</Text>
              </Pressable>
            ),
          },
          { key: 'itemsCount', title: 'Items', width: 80, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>{val || 1}</Text> },
          { key: 'subtotal', title: 'Subtotal', width: 110, render: (val: number) => <Text style={{ color: theme.colors.text }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'tax', title: 'Tax', width: 90, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'total', title: 'Total (₹)', width: 120, render: (val: number) => <Text style={{ fontWeight: '700', color: theme.colors.text }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'paid', title: 'Paid (₹)', width: 100, render: (val: number) => <Text style={{ color: '#10B981', fontWeight: '600' }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'due', title: 'Due (₹)', width: 100, render: (val: number) => <Text style={{ color: Number(val) > 0 ? '#EF4444' : theme.colors.textSecondary, fontWeight: '600' }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'paymentStatus', title: 'Payment', width: 110, render: (val: string) => renderStatusBadge(val) },
        ];

      case 'inventory_report':
        return [
          { key: 'sku', title: 'SKU Code', width: 130, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.text }}>{val}</Text> },
          { key: 'name', title: 'Product Name', flex: 2, minWidth: 200, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.text }}>{val}</Text> },
          { key: 'category', title: 'Category', width: 130, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'stockWithUnits', title: 'Stock Available', width: 180, render: (val: string) => <Text style={{ color: theme.colors.text, fontWeight: '500' }}>{val}</Text> },
          { key: 'cost', title: 'Cost (₹)', width: 100, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>₹{Number(val || 0).toFixed(2)}</Text> },
          { key: 'price', title: 'Price (₹)', width: 100, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>₹{Number(val || 0).toFixed(2)}</Text> },
          { key: 'stockValuation', title: 'Valuation (₹)', width: 130, render: (val: number) => <Text style={{ fontWeight: '700', color: theme.colors.text }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'status', title: 'Stock Status', width: 130, render: (val: string) => renderStatusBadge(val) },
        ];

      case 'customer_report':
        return [
          { key: 'customerCode', title: 'Customer ID', width: 110, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'customerName', title: 'Customer Name', flex: 2, minWidth: 190, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.text }}>{val}</Text> },
          { key: 'phone', title: 'Contact Phone', width: 140, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'totalSalesCount', title: 'Orders', width: 80, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'totalBilled', title: 'Total Billed (₹)', width: 130, render: (val: number) => <Text style={{ color: theme.colors.text }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'totalPaid', title: 'Total Paid (₹)', width: 120, render: (val: number) => <Text style={{ color: '#10B981', fontWeight: '500' }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'outstandingBalance', title: 'Balance Due (₹)', width: 130, render: (val: number) => <Text style={{ color: Number(val) > 0 ? '#EF4444' : theme.colors.textSecondary, fontWeight: '700' }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'status', title: 'Status', width: 100, render: (val: string) => renderStatusBadge(val) },
          {
            key: 'action',
            title: 'Action',
            width: 130,
            render: (_: any, item: any) => (
              <Pressable
                style={[styles.outlineActionBtn, { borderColor: theme.colors.primary, paddingVertical: 4, paddingHorizontal: 8 }]}
                onPress={() => {
                  setSelectedCustomerId(item.id);
                  handleSelectTab('customer_wise');
                }}
              >
                <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '700' }}>Statement</Text>
                <ChevronRight size={12} color={theme.colors.primary} />
              </Pressable>
            ),
          },
        ];

      case 'supplier_report':
        return [
          { key: 'supplierCode', title: 'Supplier ID', width: 110, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'supplierName', title: 'Supplier Name', flex: 2, minWidth: 200, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.text }}>{val}</Text> },
          { key: 'phone', title: 'Phone', width: 140, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'totalPurchasesCount', title: 'Orders', width: 80, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'totalPurchased', title: 'Purchased (₹)', width: 130, render: (val: number) => <Text style={{ color: theme.colors.text }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'totalPaid', title: 'Paid (₹)', width: 120, render: (val: number) => <Text style={{ color: '#10B981', fontWeight: '500' }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'outstandingBalance', title: 'Payable Due (₹)', width: 130, render: (val: number) => <Text style={{ color: Number(val) > 0 ? '#EF4444' : theme.colors.textSecondary, fontWeight: '700' }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'status', title: 'Status', width: 100, render: (val: string) => renderStatusBadge(val) },
          {
            key: 'action',
            title: 'Action',
            width: 130,
            render: (_: any, item: any) => (
              <Pressable
                style={[styles.outlineActionBtn, { borderColor: theme.colors.primary, paddingVertical: 4, paddingHorizontal: 8 }]}
                onPress={() => {
                  setSelectedSupplierId(item.id);
                  handleSelectTab('supplier_wise');
                }}
              >
                <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '700' }}>Statement</Text>
                <ChevronRight size={12} color={theme.colors.primary} />
              </Pressable>
            ),
          },
        ];

      case 'product_report':
        return [
          { key: 'sku', title: 'SKU', width: 120, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'name', title: 'Product Name', flex: 2, minWidth: 190, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.text }}>{val}</Text> },
          { key: 'category', title: 'Category', width: 120, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'unitsSold', title: 'Sold (Qty)', width: 90, render: (val: number) => <Text style={{ color: theme.colors.text, fontWeight: '500' }}>{val}</Text> },
          { key: 'revenue', title: 'Revenue (₹)', width: 120, render: (val: number) => <Text style={{ color: theme.colors.text, fontWeight: '600' }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'cost', title: 'Cost (₹)', width: 100, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'profit', title: 'Profit (₹)', width: 110, render: (val: number) => <Text style={{ color: '#10B981', fontWeight: '700' }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'margin', title: 'Margin %', width: 90, render: (val: number) => <Text style={{ color: '#10B981', fontWeight: '600' }}>{val}%</Text> },
          { key: 'currentStock', title: 'In Stock', width: 90, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
        ];

      case 'invoice_report':
        return [
          { key: 'invoiceNumber', title: 'Invoice No', width: 130, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.text }}>{val}</Text> },
          { key: 'date', title: 'Date & Time', width: 140, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'customerName', title: 'Customer', flex: 2, minWidth: 180, render: (val: string) => <Text style={{ fontWeight: '500', color: theme.colors.text }}>{val}</Text> },
          { key: 'taxableAmount', title: 'Taxable (₹)', width: 110, render: (val: number) => <Text style={{ color: theme.colors.text }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'taxAmount', title: 'GST (₹)', width: 90, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'grandTotal', title: 'Grand Total', width: 120, render: (val: number) => <Text style={{ fontWeight: '700', color: theme.colors.text }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'paymentMethod', title: 'Mode', width: 100, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'paymentStatus', title: 'Status', width: 110, render: (val: string) => renderStatusBadge(val) },
        ];

      case 'payment_report':
        return [
          { key: 'voucherNo', title: 'Voucher #', width: 120, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'date', title: 'Date', width: 110, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'type', title: 'Type', width: 100, render: (val: string) => renderStatusBadge(val) },
          { key: 'partyName', title: 'Party (Customer/Supplier)', flex: 2, minWidth: 190, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.text }}>{val}</Text> },
          { key: 'paymentMethod', title: 'Mode', width: 120, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'reference', title: 'Reference / UTR', width: 140, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'inflow', title: 'Inflow (+) (₹)', width: 120, render: (val: number) => <Text style={{ color: '#10B981', fontWeight: '700' }}>{Number(val) > 0 ? `+₹${Number(val).toLocaleString()}` : '-'}</Text> },
          { key: 'outflow', title: 'Outflow (-) (₹)', width: 120, render: (val: number) => <Text style={{ color: '#EF4444', fontWeight: '700' }}>{Number(val) > 0 ? `-₹${Number(val).toLocaleString()}` : '-'}</Text> },
        ];

      case 'expense_report':
        return [
          { key: 'voucherNo', title: 'Voucher #', width: 120, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'date', title: 'Date', width: 110, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'category', title: 'Category', width: 150, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.text }}>{val}</Text> },
          { key: 'description', title: 'Description', flex: 2, minWidth: 200, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'vendor', title: 'Paid To', width: 160, render: (val: string) => <Text style={{ color: theme.colors.text }}>{val}</Text> },
          { key: 'paymentMethod', title: 'Mode', width: 120, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'amount', title: 'Amount (₹)', width: 120, render: (val: number) => <Text style={{ color: '#EF4444', fontWeight: '700' }}>₹{Number(val || 0).toLocaleString()}</Text> },
        ];

      case 'income_report':
        return [
          { key: 'voucherNo', title: 'Voucher #', width: 120, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'date', title: 'Date', width: 110, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'category', title: 'Category', width: 160, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.text }}>{val}</Text> },
          { key: 'description', title: 'Description', flex: 2, minWidth: 200, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'receivedFrom', title: 'Received From', width: 170, render: (val: string) => <Text style={{ color: theme.colors.text }}>{val}</Text> },
          { key: 'paymentMethod', title: 'Mode', width: 130, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'amount', title: 'Amount (₹)', width: 120, render: (val: number) => <Text style={{ color: '#10B981', fontWeight: '700' }}>₹{Number(val || 0).toLocaleString()}</Text> },
        ];

      case 'tax_report':
        return [
          { key: 'invoiceNumber', title: 'Bill / INV #', width: 130, render: (val: string) => <Text style={{ fontWeight: '600', color: theme.colors.text }}>{val}</Text> },
          { key: 'date', title: 'Date', width: 110, render: (val: string) => <Text style={{ color: theme.colors.textSecondary }}>{val}</Text> },
          { key: 'type', title: 'Type', width: 100, render: (val: string) => renderStatusBadge(val) },
          { key: 'partyName', title: 'Party Name', flex: 2, minWidth: 180, render: (val: string) => <Text style={{ fontWeight: '500', color: theme.colors.text }}>{val}</Text> },
          { key: 'gstin', title: 'GSTIN', width: 160, render: (val: string) => <Text style={{ color: theme.colors.textSecondary, fontFamily: 'monospace' }}>{val}</Text> },
          { key: 'taxableValue', title: 'Taxable (₹)', width: 110, render: (val: number) => <Text style={{ color: theme.colors.text }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'cgst', title: 'CGST (₹)', width: 90, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'sgst', title: 'SGST (₹)', width: 90, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'igst', title: 'IGST (₹)', width: 90, render: (val: number) => <Text style={{ color: theme.colors.textSecondary }}>₹{Number(val || 0).toLocaleString()}</Text> },
          { key: 'totalGst', title: 'Total GST (₹)', width: 120, render: (val: number) => <Text style={{ fontWeight: '700', color: '#7C3AED' }}>₹{Number(val || 0).toLocaleString()}</Text> },
        ];

      default:
        return [
          { key: 'id', title: 'ID', width: 80 },
          { key: 'name', title: 'Name', flex: 1 },
        ];
    }
  }, [activeReportId, theme]);

  // Header action buttons
  const headerActions = (
    <View style={styles.actionButtonsRow}>
      <Pressable
        style={[styles.iconButton, { borderColor: theme.colors.border }]}
        onPress={loadReportData}
      >
        <RefreshCw size={16} color={theme.colors.textSecondary} />
      </Pressable>

      <Pressable
        style={[styles.outlineActionBtn, { borderColor: theme.colors.border }]}
        onPress={() => setIsExportModalVisible(true)}
      >
        <FileText size={15} color="#EF4444" />
        <Text style={[styles.outlineActionText, { color: theme.colors.text }]}>PDF</Text>
      </Pressable>

      <Pressable
        style={[styles.outlineActionBtn, { borderColor: theme.colors.border }]}
        onPress={() => setIsExportModalVisible(true)}
      >
        <FileSpreadsheet size={15} color="#10B981" />
        <Text style={[styles.outlineActionText, { color: theme.colors.text }]}>Excel</Text>
      </Pressable>

      <Pressable
        style={[styles.primaryActionBtn, { backgroundColor: '#2563EB' }]}
        onPress={() => setIsExportModalVisible(true)}
      >
        <Printer size={15} color="#FFF" />
        <Text style={styles.primaryActionText}>Print</Text>
      </Pressable>
    </View>
  );

  // Date Range filter control
  const dateFilters = (
    <DateFilterBar currentRange={dateRange} onChangeRange={setDateRange} />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* 1. Top Report Category / Tabs Scrollbar */}
      <View style={[styles.topTabsBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.divider }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topTabsContent}>
          {REPORT_TABS.map((tab) => {
            const isSelected = activeReportId === tab.id;
            const TabIcon = tab.icon;

            return (
              <Pressable
                key={tab.id}
                style={[
                  styles.tabChip,
                  isSelected && {
                    backgroundColor: '#FFF4EC',
                    borderColor: '#F89344',
                  }
                ]}
                onPress={() => handleSelectTab(tab.id)}
              >
                <TabIcon
                  size={16}
                  color={isSelected ? '#F89344' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    { color: isSelected ? '#F89344' : theme.colors.textSecondary },
                    isSelected && styles.tabChipTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 2. Contextual KPI Cards Bar */}
        {reportKPIs.length > 0 &&
          activeReportId !== 'profit_loss' &&
          activeReportId !== 'annual_report' &&
          activeReportId !== 'customer_wise' &&
          activeReportId !== 'supplier_wise' && (
          <View style={styles.kpiGrid}>
            {reportKPIs.map((kpi, idx) => {
              const IconComp = kpi.icon;
              return (
                <View
                  key={idx}
                  style={[
                    styles.kpiCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
                  ]}
                >
                  <View style={[styles.kpiIconBox, { backgroundColor: kpi.bg }]}>
                    <IconComp size={20} color={kpi.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>{kpi.title}</Text>
                    <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{kpi.value}</Text>
                    <Text style={[styles.kpiSub, { color: theme.colors.textSecondary }]}>{kpi.sub}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* 3. Conditional Screen Views */}
        {activeReportId === 'customer_wise' ? (
          <CustomerWiseReportView
            filters={{
              startDate: dateRange.startDate,
              endDate: dateRange.endDate,
              customerId: selectedCustomerId ? String(selectedCustomerId) : undefined,
              search: searchQuery,
            }}
            dateRangeLabel={dateRangeLabel}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={setSelectedCustomerId}
            onOpenExport={() => setIsExportModalVisible(true)}
          />
        ) : activeReportId === 'supplier_wise' ? (
          <SupplierWiseReportView
            filters={{
              startDate: dateRange.startDate,
              endDate: dateRange.endDate,
              supplierId: selectedSupplierId ? String(selectedSupplierId) : undefined,
              search: searchQuery,
            }}
            dateRangeLabel={dateRangeLabel}
            selectedSupplierId={selectedSupplierId}
            onSelectSupplier={setSelectedSupplierId}
            onOpenExport={() => setIsExportModalVisible(true)}
          />
        ) : activeReportId === 'profit_loss' ? (
          <ProfitLossView data={statementData} dateRangeLabel={dateRangeLabel} />
        ) : activeReportId === 'annual_report' ? (
          <AnnualReportView data={statementData} dateRangeLabel={dateRangeLabel} />
        ) : (
          <View style={styles.tableWrapper}>
            <AdvancedTable
              title={activeTabConfig.label}
              subtitle={`${activeTabConfig.subtitle} • ${dateRangeLabel}`}
              headerActions={headerActions}
              columns={tableColumns}
              data={filteredData}
              searchPlaceholder={`Search in ${activeTabConfig.label.toLowerCase()}...`}
              onSearch={setSearchQuery}
              filters={dateFilters}
              isLoading={isLoading}
              hasCheckbox={false}
            />
          </View>
        )}

      </ScrollView>

      {/* 4. Export & Print Dialog Modal */}
      <ReportExportModal
        visible={isExportModalVisible}
        onClose={() => setIsExportModalVisible(false)}
        reportTitle={activeTabConfig.label}
        totalRecords={filteredData.length}
        dateRangeLabel={dateRangeLabel}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topTabsBar: {
    borderBottomWidth: 1,
  },
  topTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 8,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabChipTextActive: {
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: 190,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kpiIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 11,
    marginTop: 2,
  },
  tableWrapper: {
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  outlineActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  primaryActionText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  dateChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterGroupLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 4,
    letterSpacing: 0.5,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 6,
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
