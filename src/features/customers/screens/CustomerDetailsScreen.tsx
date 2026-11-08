import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { customerRepository } from '../../../core/repositories/CustomerRepository';
import { Customer } from '../../../types/models';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  History, 
  Edit, 
  FileText,
  FileSpreadsheet,
  Printer,
  MessageCircle,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react-native';
import { DateFilterBar, DateRangeState, computePresetDates } from '../../reports/components/DateFilterBar';
import { ReportsService } from '../../reports/services/reports.service';
import {
  exportReportToExcel,
  exportReportToPdf,
  printOrSavePdfReport,
  shareReportToWhatsApp,
} from '../../reports/utils/reportExportUtils';

export const CustomerDetailsScreen = ({ route, navigation, customerId, onNavigate }: any) => {
  const theme = useTheme();
  const { isMobile, isDesktop } = useResponsive();
  const id = customerId ?? route?.params?.id;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Date Range filter state for customer statement
  const [dateRange, setDateRange] = useState<DateRangeState>(() => {
    const init = computePresetDates('month');
    return {
      preset: 'month',
      startDate: init.startDate,
      endDate: init.endDate,
      label: init.label,
    };
  });
  const [statementData, setStatementData] = useState<any>(null);
  const [statementLoading, setStatementLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadCustomer();
      loadStatement();
    }
  }, [id, dateRange.startDate, dateRange.endDate]);

  const loadCustomer = async () => {
    try {
      const data = await customerRepository.getById(Number(id));
      setCustomer(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadStatement = async () => {
    setStatementLoading(true);
    try {
      const res = await ReportsService.getCustomerWiseStatement(id, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      setStatementData(res);
    } catch (e) {
      console.error('Failed to load customer statement:', e);
    } finally {
      setStatementLoading(false);
    }
  };

  const handlePdf = () => {
    if (!customer) return;
    exportReportToPdf({
      title: `Customer Statement - ${customer.name}`,
      dateRangeLabel: dateRange.label,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      columns: [
        { key: 'invoiceNumber', title: 'Invoice #' },
        { key: 'date', title: 'Date' },
        { key: 'total', title: 'Total (₹)' },
        { key: 'paid', title: 'Paid (₹)' },
        { key: 'due', title: 'Due (₹)' },
        { key: 'paymentStatus', title: 'Status' },
      ],
      data: statementData?.sales || [],
      summary: statementData?.summary || {},
      partyName: customer.name,
      phone: customer.phone,
    });
  };

  const handleExcel = () => {
    if (!customer) return;
    exportReportToExcel({
      title: `Customer Statement - ${customer.name}`,
      dateRangeLabel: dateRange.label,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      columns: [
        { key: 'invoiceNumber', title: 'Invoice #' },
        { key: 'date', title: 'Date' },
        { key: 'total', title: 'Total (₹)' },
        { key: 'paid', title: 'Paid (₹)' },
        { key: 'due', title: 'Due (₹)' },
        { key: 'paymentStatus', title: 'Status' },
      ],
      data: statementData?.sales || [],
      summary: statementData?.summary || {},
      partyName: customer.name,
      phone: customer.phone,
    });
  };

  const handleWhatsApp = () => {
    if (!customer) return;
    shareReportToWhatsApp({
      title: `Customer Statement - ${customer.name}`,
      dateRangeLabel: dateRange.label,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      columns: [
        { key: 'invoiceNumber', title: 'Invoice #' },
        { key: 'date', title: 'Date' },
        { key: 'total', title: 'Total (₹)' },
        { key: 'paid', title: 'Paid (₹)' },
        { key: 'due', title: 'Due (₹)' },
        { key: 'paymentStatus', title: 'Status' },
      ],
      data: statementData?.sales || [],
      summary: statementData?.summary || {},
      partyName: customer.name,
      phone: customer.phone,
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>Customer not found</Text>
        <TouchableOpacity
          style={[styles.backOutlineBtn, { borderColor: theme.colors.border, marginTop: 12 }]}
          onPress={() => onNavigate ? onNavigate('list') : navigation?.goBack?.()}
        >
          <ArrowLeft size={16} color={theme.colors.text} />
          <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Back to List</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rawStatus = String(customer.status || 'Active').toUpperCase();
  const isInactive = rawStatus === 'INACTIVE' || rawStatus === 'DISABLED';
  const statusColor = isInactive ? '#EF4444' : '#10B981';
  const statusBg = isInactive ? '#FEF2F2' : '#ECFDF5';
  const statusLabel = isInactive ? 'Inactive' : 'Active';

  const balance = Number(customer.outstandingBalance || 0);
  const balanceColor = balance > 0 ? '#EF4444' : balance < 0 ? '#10B981' : theme.colors.textSecondary;

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[styles.contentContainer, isMobile && { padding: 12 }]}
    >
      <View style={[styles.wrapper, { maxWidth: isDesktop ? 860 : '100%' }]}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity 
            style={[styles.backOutlineBtn, { borderColor: theme.colors.border }]} 
            onPress={() => onNavigate ? onNavigate('list') : navigation?.goBack?.()}
          >
            <ArrowLeft size={16} color={theme.colors.text} />
            <Text style={[styles.backOutlineText, { color: theme.colors.text }]}>Back to Customers</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Header Card */}
        <View style={[styles.card, isMobile && styles.cardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.headerRow, isMobile && { marginBottom: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.avatar, isMobile && styles.avatarMobile, { backgroundColor: '#EFF6FF' }]}>
                <User size={isMobile ? 18 : 24} color="#2563EB" />
              </View>
              <View>
                <Text style={[styles.nameText, isMobile && styles.nameTextMobile, { color: theme.colors.text }]}>{customer.name}</Text>
                <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 }}>
                  ID: #{customer.id} • CU{String((String(customer.id).charCodeAt(0) || 0) % 999).padStart(3, '0')}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusColor }]}>
                <View style={[styles.dot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
              <SyncBadge status={customer.syncStatus || 'synced'} />
            </View>
          </View>

          {/* Balance Spotlight */}
          <View style={[
            styles.balanceSpotlight,
            isMobile && styles.balanceSpotlightMobile,
            {
              backgroundColor: balance > 0 ? '#FEF2F2' : balance < 0 ? '#ECFDF5' : '#F8FAFC',
              borderColor: balance > 0 ? '#FCA5A5' : balance < 0 ? '#A7F3D0' : theme.colors.border,
            }
          ]}>
            <View>
              <Text style={[styles.balanceLabel, isMobile && { fontSize: 9.5 }]}>
                {balance > 0 ? 'CURRENT DUE BALANCE' : balance < 0 ? 'ADVANCE CREDIT' : 'BALANCE STATUS'}
              </Text>
              <Text style={[styles.balanceAmount, isMobile && styles.balanceAmountMobile, { color: balanceColor }]}>
                {balance < 0 ? `₹${Math.abs(balance).toFixed(2)} Credit` : `₹${balance.toFixed(2)}`}
              </Text>
            </View>
            <View>
              <Text style={[styles.balanceSub, isMobile && { fontSize: 11 }, { color: theme.colors.textSecondary }]}>
                {balance > 0 ? 'Payment Overdue' : balance < 0 ? 'Advance Paid' : 'All Accounts Cleared'}
              </Text>
            </View>
          </View>

          {/* Contact & Business Info Grid */}
          <View style={[styles.infoGrid, isMobile && { flexDirection: 'column', gap: 8 }]}>
            <View style={[styles.infoCol, isMobile ? { width: '100%', gap: 8 } : { width: '48%' }]}>
              <View style={[styles.infoRow, isMobile && { gap: 6 }]}>
                <Mail size={14} color={theme.colors.textSecondary} />
                <View style={{ flex: 1, flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start' }}>
                  <Text style={styles.infoKey}>Email</Text>
                  <Text style={[styles.infoVal, isMobile && { fontSize: 12 }, { color: theme.colors.text }]}>{customer.email || 'N/A'}</Text>
                </View>
              </View>

              <View style={[styles.infoRow, isMobile && { gap: 6 }]}>
                <Phone size={14} color={theme.colors.textSecondary} />
                <View style={{ flex: 1, flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start' }}>
                  <Text style={styles.infoKey}>Phone</Text>
                  <Text style={[styles.infoVal, isMobile && { fontSize: 12 }, { color: theme.colors.text }]}>{customer.phone || 'N/A'}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.infoCol, isMobile ? { width: '100%', gap: 8 } : { width: '48%' }]}>
              <View style={[styles.infoRow, isMobile && { gap: 6 }]}>
                <MapPin size={14} color={theme.colors.textSecondary} />
                <View style={{ flex: 1, flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start' }}>
                  <Text style={styles.infoKey}>Address</Text>
                  <Text style={[styles.infoVal, isMobile && { fontSize: 12 }, { color: theme.colors.text }]} numberOfLines={1}>{customer.address || 'N/A'}</Text>
                </View>
              </View>

              <View style={[styles.infoRow, isMobile && { gap: 6 }]}>
                <FileText size={14} color={theme.colors.textSecondary} />
                <View style={{ flex: 1, flexDirection: isMobile ? 'row' : 'column', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start' }}>
                  <Text style={styles.infoKey}>GSTIN</Text>
                  <Text style={[styles.infoVal, isMobile && { fontSize: 12 }, { color: theme.colors.text }]}>{customer.gstin || 'N/A'}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons Toolbar */}
        <View style={[styles.actionsBar, isMobile && { flexDirection: 'row', gap: 8 }]}>
          <TouchableOpacity 
            style={[styles.actionBtn, isMobile && styles.actionBtnMobile, { backgroundColor: '#F97316' }]} 
            onPress={() => onNavigate ? onNavigate('form', customer.id) : navigation?.navigate('CustomerForm', { id: customer.id })}
          >
            <Edit size={14} color="white" />
            <Text style={[styles.actionBtnText, isMobile && styles.actionBtnTextMobile]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, isMobile && styles.actionBtnMobile, { backgroundColor: '#10B981' }]} 
            onPress={() => onNavigate ? onNavigate('payment_form', customer.id, { entityType: 'customer', paymentType: 'receive' }) : navigation?.navigate('PaymentForm', { customerId: customer.id })}
          >
            <CreditCard size={14} color="white" />
            <Text style={[styles.actionBtnText, isMobile && styles.actionBtnTextMobile]}>Receive</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, isMobile && styles.actionBtnMobile, { backgroundColor: '#2563EB' }]} 
            onPress={() => onNavigate ? onNavigate('payment_history', customer.id) : navigation?.navigate('PaymentHistory', { customerId: customer.id })}
          >
            <History size={14} color="white" />
            <Text style={[styles.actionBtnText, isMobile && styles.actionBtnTextMobile]}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Customer Statement Section with Date-Wise Filter */}
        <View style={[styles.card, isMobile && styles.cardMobile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginTop: 14 }]}>
          <View style={[styles.statementHeader, isMobile && styles.statementHeaderMobile, { borderBottomColor: theme.colors.divider }]}>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Text style={[styles.statementTitle, { color: theme.colors.text }]}>Billing Statement</Text>
              <Text style={[styles.statementSub, { color: theme.colors.textSecondary }]}>{dateRange.label}</Text>
            </View>
            <View style={styles.statementActionsRow}>
              <TouchableOpacity style={[styles.smallActionBtn, { borderColor: theme.colors.border }]} onPress={handlePdf}>
                <FileText size={11} color="#EF4444" />
                <Text style={[styles.smallActionText, { color: theme.colors.text }]}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallActionBtn, { borderColor: theme.colors.border }]} onPress={handleExcel}>
                <FileSpreadsheet size={11} color="#10B981" />
                <Text style={[styles.smallActionText, { color: theme.colors.text }]}>Excel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallActionBtn, { borderColor: '#16A34A', backgroundColor: '#DCFCE720' }]} onPress={handleWhatsApp}>
                <MessageCircle size={11} color="#16A34A" />
                <Text style={[styles.smallActionText, { color: '#16A34A' }]}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallActionBtn, { backgroundColor: '#2563EB', borderColor: '#2563EB' }]} onPress={handlePdf}>
                <Printer size={11} color="#FFF" />
                <Text style={[styles.smallActionText, { color: '#FFF' }]}>Print</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Date Filter Bar */}
          <View style={[styles.dateBarWrapper, { borderBottomColor: theme.colors.divider }]}>
            <DateFilterBar currentRange={dateRange} onChangeRange={setDateRange} />
          </View>

          {/* Statement Period Summary Cards (Reduced height up to 50%) */}
          <View style={styles.periodKpiGrid}>
            <View style={[styles.periodKpiCard, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
              <Text style={styles.periodKpiLabel}>Invoices</Text>
              <Text style={[styles.periodKpiValue, { color: '#2563EB' }]}>
                {statementData?.summary?.totalOrders ?? statementData?.sales?.length ?? 0}
              </Text>
            </View>
            <View style={[styles.periodKpiCard, { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }]}>
              <Text style={styles.periodKpiLabel}>Billed (₹)</Text>
              <Text style={[styles.periodKpiValue, { color: '#10B981' }]}>
                ₹{Number(statementData?.summary?.totalBilled ?? 0).toLocaleString()}
              </Text>
            </View>
            <View style={[styles.periodKpiCard, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}>
              <Text style={styles.periodKpiLabel}>Paid (₹)</Text>
              <Text style={[styles.periodKpiValue, { color: '#10B981' }]}>
                ₹{Number(statementData?.summary?.totalPaid ?? 0).toLocaleString()}
              </Text>
            </View>
            <View style={[styles.periodKpiCard, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
              <Text style={styles.periodKpiLabel}>Period Due</Text>
              <Text style={[styles.periodKpiValue, { color: Number(statementData?.summary?.outstandingBalance ?? 0) > 0 ? '#EF4444' : '#10B981' }]}>
                ₹{Number(statementData?.summary?.outstandingBalance ?? 0).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Invoices List */}
          {statementLoading ? (
            <View style={{ padding: 14, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : !statementData?.sales || statementData.sales.length === 0 ? (
            <View style={{ padding: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: 11.5, color: theme.colors.textSecondary }}>No transactions recorded for this period</Text>
            </View>
          ) : (
            <View style={{ gap: 4, marginTop: 6 }}>
              {statementData.sales.map((item: any, idx: number) => (
                <View key={item.id || idx} style={[styles.txnRow, { borderBottomColor: theme.colors.divider }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.txnTitle, { color: theme.colors.text }]}>{item.invoiceNumber}</Text>
                    <Text style={{ fontSize: 10.5, color: theme.colors.textSecondary }}>{item.date} • {item.paymentStatus || 'Completed'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.txnAmount, { color: theme.colors.text }]}>₹{Number(item.total || 0).toLocaleString()}</Text>
                    <Text style={{ fontSize: 10, color: Number(item.due || 0) > 0 ? '#EF4444' : '#10B981', fontWeight: '600' }}>
                      {Number(item.due || 0) > 0 ? `Due: ₹${Number(item.due).toLocaleString()}` : 'Paid'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 20, alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  wrapper: { width: '100%' },
  navBar: {
    marginBottom: 16,
    flexDirection: 'row',
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
  card: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  balanceSpotlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  balanceSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  infoCol: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoKey: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
    minWidth: 140,
  },
  actionBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  cardMobile: {
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  avatarMobile: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  nameTextMobile: {
    fontSize: 15,
  },
  balanceSpotlightMobile: {
    padding: 10,
    marginBottom: 12,
  },
  balanceAmountMobile: {
    fontSize: 16,
  },
  actionBtnMobile: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 80,
  },
  actionBtnTextMobile: {
    fontSize: 12,
  },
  statementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexWrap: 'wrap',
    gap: 8,
  },
  statementHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  statementTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  statementSub: {
    fontSize: 11,
    marginTop: 1,
  },
  statementActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  smallActionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateBarWrapper: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  periodKpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  periodKpiCard: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  periodKpiLabel: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
  },
  periodKpiValue: {
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 1,
  },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  txnTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  txnAmount: {
    fontSize: 12.5,
    fontWeight: '700',
  },
});



