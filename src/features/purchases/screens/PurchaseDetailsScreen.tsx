import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { usePurchase } from '../api/usePurchases';
import { ArrowLeft, PackageCheck, User, Calendar, FileText, DollarSign, Edit, MessageCircle, Printer, Share2 } from 'lucide-react-native';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { AddPurchaseModal } from '../components/AddPurchaseModal';
import { supplierRepository } from '../../../core/repositories/SupplierRepository';
import { shareReportToWhatsApp } from '../../reports/utils/reportExportUtils';
import { ReceiptPrintPreviewModal, ReceiptPrintData } from '../../pos/components/ReceiptPrintPreviewModal';
import { SharePurchaseModal } from '../components/SharePurchaseModal';

export const PurchaseDetailsScreen = ({ onNavigate, entityId }: any) => {
  const theme = useTheme();
  const { isMobile, windowWidth } = useResponsive();
  const numericId = entityId ? parseInt(String(entityId), 10) : null;
  const { data: purchase, isLoading } = usePurchase(numericId);
  const [showEditModal, setShowEditModal] = useState(false);
  const [supplierBalance, setSupplierBalance] = useState<number | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [printPurchaseData, setPrintPurchaseData] = useState<ReceiptPrintData | null>(null);

  useEffect(() => {
    if (purchase?.supplierId) {
      supplierRepository.getById(Number(purchase.supplierId)).then((supp) => {
        if (supp) {
          setSupplierBalance(Number(supp.outstandingBalance || 0));
        }
      }).catch(() => {});
    }
  }, [purchase?.supplierId]);

  const handleOpenPrintPreview = () => {
    if (!purchase) return;
    const invNo = purchase.reference || purchase.invoiceNumber || `PUR-${purchase.id}`;
    const itemsForPrint = (purchase.items || []).map((it: any, idx: number) => {
      const baseUnit = it.baseUnitName || it.product?.baseUnitName || it.product?.unitName || it.unit || 'Unit';
      const subUnit = it.subUnit || it.subUnitName || it.product?.subUnitName;
      const uType = it.unitType || 'base';
      const displayUnit = (uType === 'sub' && subUnit) ? subUnit : (it.unit || it.unitName || baseUnit);
      return {
        productId: it.productId,
        productName: it.productName || `Item #${idx + 1}`,
        sku: it.sku,
        brand: it.brand || it.brandName || it.product?.brandName,
        brandName: it.brandName || it.brand || it.product?.brandName,
        unit: displayUnit,
        unitName: displayUnit,
        baseUnitName: baseUnit,
        subUnit: subUnit,
        subUnitName: subUnit,
        unitType: uType,
        conversionRate: it.conversionRate !== undefined ? Number(it.conversionRate) : (it.product?.conversionRate ? Number(it.product.conversionRate) : undefined),
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice || 0),
        discount: Number(it.discount || 0),
        gst: Number(it.gst || 0),
        taxAmount: Number(it.taxAmount || 0),
        total: Number(it.total || 0),
        hsn: it.hsn || '',
      };
    });

    const rData: ReceiptPrintData = {
      invoiceNumber: invNo,
      reference: purchase.reference,
      date: purchase.date || '',
      customerName: purchase.supplierName || 'Supplier',
      customerPhone: (purchase as any).supplierPhone || '',
      customerAddress: (purchase as any).supplierAddress || '',
      customerGstin: (purchase as any).supplierGstin || '',
      customerType: 'wholesale',
      biller: (purchase as any).biller || 'Purchase Officer',
      subtotal: Number(purchase.subtotal || purchase.total || 0),
      discount: Number(purchase.discount || 0),
      gst: Number(purchase.gst || purchase.orderTax || 0),
      shipping: Number(purchase.shipping || 0),
      total: Number(purchase.total || 0),
      paid: Number(purchase.paid !== undefined ? purchase.paid : (purchase.total || 0)),
      due: Number(purchase.due !== undefined ? purchase.due : 0),
      paymentMethod: (purchase as any).paymentMethod || 'Cash',
      notes: purchase.notes,
      previousDue: supplierBalance !== null ? supplierBalance : (purchase.previousDue ? Number(purchase.previousDue) : undefined),
      advancePayment: purchase.advancePayment ? Number(purchase.advancePayment) : undefined,
      showPreviousBalance: purchase.showPreviousBalance !== undefined ? Boolean(purchase.showPreviousBalance) : false,
      docTitle: 'PURCHASE BILL',
      partyTitle: 'SUPPLIER DETAILS',
      items: itemsForPrint.length > 0 ? itemsForPrint : [{
        productName: 'General Goods / Services',
        quantity: 1,
        unitPrice: Number(purchase.total || 0),
        discount: 0,
        gst: 0,
        total: Number(purchase.total || 0),
        unit: 'Unit',
      }],
    };

    setPrintPurchaseData(rData);
    setShowPrintModal(true);
  };

  const handleShareWhatsApp = async () => {
    if (!purchase) return;
    const invNo = purchase.reference || purchase.invoiceNumber || `PUR-${purchase.id}`;
    const items = (purchase.items || []).map((it: any, idx: number) => ({
      sNo: idx + 1,
      name: it.productName || `Item #${idx + 1}`,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice || 0),
      tax: Number(it.taxAmount || 0),
      total: Number(it.total || 0),
    }));

    const summaryObj: any = {
      totalItems: items.length,
      grandTotal: purchase.total || 0,
      paidAmount: purchase.paid || 0,
      totalDue: Number(purchase.due || 0),
    };
    if (purchase.advancePayment && Number(purchase.advancePayment) > 0) {
      summaryObj.advancePayment = Number(purchase.advancePayment);
    }

    await shareReportToWhatsApp({
      title: `Purchase Bill - ${invNo}`,
      dateRangeLabel: `Date: ${purchase.date || ''}`,
      partyName: purchase.supplierName || 'Supplier',
      phone: (purchase as any).supplierPhone || '',
      columns: [
        { key: 'name', title: 'Product / Item', width: 140 },
        { key: 'quantity', title: 'Qty', width: 60 },
        { key: 'unitPrice', title: 'Cost (Rs.)', width: 80 },
        { key: 'tax', title: 'Tax (Rs.)', width: 70 },
        { key: 'total', title: 'Total (Rs.)', width: 90 },
      ],
      data: items,
      summary: summaryObj,
    });
  };

  const backLabel = !isMobile ? 'Back to Purchases' : (windowWidth >= 400 ? 'Purchases' : 'Back');
  const editLabel = !isMobile ? 'Edit Purchase' : (windowWidth >= 400 ? 'Edit' : '');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: isMobile ? 12 : 20 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('list')}>
          <ArrowLeft size={18} color={theme.colors.text} />
          <Text style={{ color: theme.colors.text, fontWeight: '600', marginLeft: 6 }}>{backLabel}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text, flex: 1, fontSize: isMobile ? 16 : 18 }]} numberOfLines={1}>
          Purchase Details
        </Text>
        {purchase && (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: '#2563EB', paddingHorizontal: isMobile ? 8 : 12 }]}
              onPress={handleOpenPrintPreview}
            >
              <Printer size={16} color="white" />
              {!isMobile && <Text style={{ color: 'white', fontWeight: '600', marginLeft: 6 }}>Print</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: '#10B981', paddingHorizontal: isMobile ? 8 : 12 }]}
              onPress={() => setShowShareModal(true)}
            >
              <Share2 size={16} color="white" />
              {!isMobile && <Text style={{ color: 'white', fontWeight: '600', marginLeft: 6 }}>Share</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: '#16A34A', paddingHorizontal: editLabel ? 12 : 8 }]}
              onPress={handleShareWhatsApp}
            >
              <MessageCircle size={16} color="white" />
              {!isMobile && <Text style={{ color: 'white', fontWeight: '600', marginLeft: 6 }}>WhatsApp</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: '#F97316', paddingHorizontal: editLabel ? 12 : 8 }]}
              onPress={() => setShowEditModal(true)}
            >
              <Edit size={16} color="white" />
              {editLabel ? (
                <Text style={{ color: 'white', fontWeight: '600', marginLeft: 6 }}>{editLabel}</Text>
              ) : null}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: isMobile ? 12 : 20 }}>
        {isLoading ? (
          <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 40 }}>Loading purchase details...</Text>
        ) : !purchase ? (
          <View style={styles.card}>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
              Purchase #{entityId} (Demo Record)
            </Text>
            <Text style={{ color: theme.colors.textSecondary, marginBottom: 16 }}>
              This is a demonstration entry. Newly created purchases will show full line-item breakdowns here.
            </Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('list')}>
              <Text style={{ color: '#F97316', fontWeight: '600' }}>Return to List</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {/* Purchase Overview Card */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <PackageCheck size={22} color="#F97316" />
                  <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>
                    {purchase.reference || purchase.invoiceNumber}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <SyncBadge status={purchase.syncStatus || 'synced'} />
                  <View style={[styles.badge, { backgroundColor: '#10B981' }]}>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>{purchase.status}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: purchase.paymentStatus === 'Paid' ? '#ECFDF5' : '#FEF2F2' }]}>
                    <Text style={{ color: purchase.paymentStatus === 'Paid' ? '#10B981' : '#EF4444', fontSize: 12, fontWeight: '600' }}>
                      {purchase.paymentStatus}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.grid}>
                <View style={styles.gridItem}>
                  <Text style={styles.label}>Supplier</Text>
                  <Text style={[styles.val, { color: theme.colors.text }]}>{purchase.supplierName || 'N/A'}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.label}>Date</Text>
                  <Text style={[styles.val, { color: theme.colors.text }]}>{purchase.date}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.label}>Invoice #</Text>
                  <Text style={[styles.val, { color: theme.colors.text }]}>{purchase.invoiceNumber}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.label}>Total Amount</Text>
                  <Text style={[styles.val, { color: '#F97316', fontWeight: '700' }]}>₹{purchase.total?.toFixed(2)}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.label}>Paid Amount</Text>
                  <Text style={[styles.val, { color: '#10B981', fontWeight: '600' }]}>₹{(purchase.paid || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.label}>Due Amount</Text>
                  <Text style={[styles.val, { color: (purchase.due || 0) > 0 ? '#EF4444' : theme.colors.text, fontWeight: '600' }]}>₹{(purchase.due || 0).toFixed(2)}</Text>
                </View>
              </View>

              {purchase.notes ? (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                  <Text style={styles.label}>Notes</Text>
                  <Text style={{ color: theme.colors.textSecondary, marginTop: 4 }}>{purchase.notes}</Text>
                </View>
              ) : null}
            </View>

            {/* Line Items Table */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
                Purchased Items ({purchase.items?.length || 0})
              </Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View style={{ minWidth: 650 }}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.th, { width: 200 }]}>Product</Text>
                    <Text style={[styles.th, { width: 80 }]}>Qty</Text>
                    <Text style={[styles.th, { width: 100 }]}>Price (₹)</Text>
                    <Text style={[styles.th, { width: 90 }]}>Discount (₹)</Text>
                    <Text style={[styles.th, { width: 80 }]}>Tax</Text>
                    <Text style={[styles.th, { width: 100 }]}>Total (₹)</Text>
                  </View>

                  {(!purchase.items || purchase.items.length === 0) ? (
                    <Text style={{ color: theme.colors.textSecondary, padding: 16, textAlign: 'center' }}>No item details recorded</Text>
                  ) : (
                    purchase.items.map((item, idx) => (
                      <View key={item.id || idx} style={[styles.tableRow, { borderBottomColor: theme.colors.border }]}>
                        <Text style={[styles.td, { width: 200, fontWeight: '600' }]} numberOfLines={1}>
                          {item.productName || `Product #${item.productId}`}
                        </Text>
                        <Text style={[styles.td, { width: 80 }]}>
                          {item.quantity}{item.unit && item.unit !== 'Unit' ? ` ${item.unit}` : ''}
                        </Text>
                        <Text style={[styles.td, { width: 100 }]}>₹{item.unitPrice?.toFixed(2)}</Text>
                        <Text style={[styles.td, { width: 90 }]}>₹{item.discount?.toFixed(2)}</Text>
                        <Text style={[styles.td, { width: 80 }]}>{item.gst}%</Text>
                        <Text style={[styles.td, { width: 100, fontWeight: '700', color: '#F97316' }]}>
                          ₹{item.total?.toFixed(2)}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </View>

            {/* Financial Summary */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, maxWidth: isMobile ? '100%' : 400, alignSelf: isMobile ? 'stretch' : 'flex-end', width: '100%' }]}>
              <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '700', marginBottom: 10 }}>Summary</Text>
              <View style={styles.summaryLine}>
                <Text style={styles.label}>Subtotal</Text>
                <Text style={[styles.val, { color: theme.colors.text }]}>₹{purchase.subtotal?.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryLine}>
                <Text style={styles.label}>Discount</Text>
                <Text style={[styles.val, { color: '#EF4444' }]}>-₹{purchase.discount?.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryLine}>
                <Text style={styles.label}>Tax</Text>
                <Text style={[styles.val, { color: theme.colors.text }]}>+₹{(purchase.gst + (purchase.orderTax || 0)).toFixed(2)}</Text>
              </View>
              <View style={styles.summaryLine}>
                <Text style={styles.label}>Shipping</Text>
                <Text style={[styles.val, { color: theme.colors.text }]}>+₹{purchase.shipping?.toFixed(2)}</Text>
              </View>
              <View style={[styles.summaryLine, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 4 }]}>
                <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>Grand Total</Text>
                <Text style={{ color: '#F97316', fontWeight: '800', fontSize: 18 }}>₹{purchase.total?.toFixed(2)}</Text>
              </View>

              <View style={styles.summaryLine}>
                <Text style={styles.label}>Paid Amount</Text>
                <Text style={[styles.val, { color: '#10B981', fontWeight: '600' }]}>₹{(purchase.paid || 0).toFixed(2)}</Text>
              </View>

              {purchase.advancePayment && Number(purchase.advancePayment) > 0 ? (
                <View style={[styles.summaryLine, { backgroundColor: '#F0FDF4', padding: 6, borderRadius: 4, marginTop: 4 }]}>
                  <Text style={[styles.label, { color: '#16A34A', fontWeight: 'bold' }]}>Advance Applied:</Text>
                  <Text style={[styles.val, { color: '#16A34A', fontWeight: 'bold' }]}>
                    ₹{Number(purchase.advancePayment).toFixed(2)}
                  </Text>
                </View>
              ) : null}

              <View style={[styles.summaryLine, { backgroundColor: (purchase.due || 0) > 0 ? '#FEF2F2' : '#F8FAFC', padding: 6, borderRadius: 4, marginTop: 4 }]}>
                <Text style={[styles.label, { color: (purchase.due || 0) > 0 ? '#DC2626' : theme.colors.text, fontWeight: 'bold' }]}>Bill Due:</Text>
                <Text style={[styles.val, { color: (purchase.due || 0) > 0 ? '#DC2626' : theme.colors.text, fontWeight: 'bold' }]}>
                  ₹{(purchase.due || 0).toFixed(2)}
                </Text>
              </View>

              {supplierBalance !== null && (
                <View style={[styles.summaryLine, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.label, { fontSize: 11, color: theme.colors.textSecondary }]}>Supplier Total Balance:</Text>
                  <Text style={[styles.val, { fontSize: 11, fontWeight: '600', color: supplierBalance > 0 ? '#DC2626' : (supplierBalance < 0 ? '#16A34A' : theme.colors.textSecondary) }]}>
                    {supplierBalance > 0 ? `₹${supplierBalance.toFixed(2)} (Due)` : (supplierBalance < 0 ? `₹${Math.abs(supplierBalance).toFixed(2)} (Advance)` : '₹0.00')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <AddPurchaseModal
        visible={showEditModal}
        editPurchaseId={numericId}
        onClose={() => setShowEditModal(false)}
      />

      <ReceiptPrintPreviewModal
        visible={showPrintModal}
        data={printPurchaseData}
        onClose={() => {
          setShowPrintModal(false);
          setPrintPurchaseData(null);
        }}
      />

      <SharePurchaseModal
        visible={showShareModal}
        purchase={purchase}
        onClose={() => setShowShareModal(false)}
        onOpenFullPreview={() => {
          setShowShareModal(false);
          handleOpenPrintPreview();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 16,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  title: { fontSize: 18, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 8, padding: 16 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { minWidth: 120, flex: 1 },
  label: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  val: { fontSize: 14, fontWeight: '500' },
  tableHeader: { flexDirection: 'row', paddingVertical: 8, backgroundColor: '#F1F5F9', paddingHorizontal: 8, borderRadius: 4 },
  th: { fontSize: 12, fontWeight: '700', color: '#475569' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1 },
  td: { fontSize: 13, color: '#334155' },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
});
