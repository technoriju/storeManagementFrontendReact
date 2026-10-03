import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { usePurchase } from '../api/usePurchases';
import { ArrowLeft, PackageCheck, User, Calendar, FileText, DollarSign } from 'lucide-react-native';

export const PurchaseDetailsScreen = ({ onNavigate, entityId }: any) => {
  const theme = useTheme();
  const numericId = entityId ? parseInt(String(entityId), 10) : null;
  const { data: purchase, isLoading } = usePurchase(numericId);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('list')}>
          <ArrowLeft size={18} color={theme.colors.text} />
          <Text style={{ color: theme.colors.text, fontWeight: '600', marginLeft: 6 }}>Back to Purchases</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Purchase Details</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
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
                <View style={{ flexDirection: 'row', gap: 8 }}>
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
                  <Text style={[styles.val, { color: '#F97316', fontWeight: '700' }]}>${purchase.total?.toFixed(2)}</Text>
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
                    <Text style={[styles.th, { width: 100 }]}>Price</Text>
                    <Text style={[styles.th, { width: 90 }]}>Discount</Text>
                    <Text style={[styles.th, { width: 80 }]}>Tax</Text>
                    <Text style={[styles.th, { width: 100 }]}>Total</Text>
                  </View>

                  {(!purchase.items || purchase.items.length === 0) ? (
                    <Text style={{ color: theme.colors.textSecondary, padding: 16, textAlign: 'center' }}>No item details recorded</Text>
                  ) : (
                    purchase.items.map((item, idx) => (
                      <View key={item.id || idx} style={[styles.tableRow, { borderBottomColor: theme.colors.border }]}>
                        <Text style={[styles.td, { width: 200, fontWeight: '600' }]} numberOfLines={1}>
                          {item.productName || `Product #${item.productId}`}
                        </Text>
                        <Text style={[styles.td, { width: 80 }]}>{item.quantity}</Text>
                        <Text style={[styles.td, { width: 100 }]}>${item.unitPrice?.toFixed(2)}</Text>
                        <Text style={[styles.td, { width: 90 }]}>${item.discount?.toFixed(2)}</Text>
                        <Text style={[styles.td, { width: 80 }]}>{item.gst}%</Text>
                        <Text style={[styles.td, { width: 100, fontWeight: '700', color: '#F97316' }]}>
                          ${item.total?.toFixed(2)}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </View>

            {/* Financial Summary */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, maxWidth: 400, alignSelf: 'flex-end', width: '100%' }]}>
              <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '700', marginBottom: 10 }}>Summary</Text>
              <View style={styles.summaryLine}>
                <Text style={styles.label}>Subtotal</Text>
                <Text style={[styles.val, { color: theme.colors.text }]}>${purchase.subtotal?.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryLine}>
                <Text style={styles.label}>Discount</Text>
                <Text style={[styles.val, { color: '#EF4444' }]}>-${purchase.discount?.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryLine}>
                <Text style={styles.label}>Tax</Text>
                <Text style={[styles.val, { color: theme.colors.text }]}>+${(purchase.gst + (purchase.orderTax || 0)).toFixed(2)}</Text>
              </View>
              <View style={styles.summaryLine}>
                <Text style={styles.label}>Shipping</Text>
                <Text style={[styles.val, { color: theme.colors.text }]}>+${purchase.shipping?.toFixed(2)}</Text>
              </View>
              <View style={[styles.summaryLine, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 4 }]}>
                <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>Grand Total</Text>
                <Text style={{ color: '#F97316', fontWeight: '800', fontSize: 18 }}>${purchase.total?.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
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
  title: { fontSize: 18, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 8, padding: 16 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridItem: { minWidth: 140 },
  label: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  val: { fontSize: 14, fontWeight: '500' },
  tableHeader: { flexDirection: 'row', paddingVertical: 8, backgroundColor: '#F1F5F9', paddingHorizontal: 8, borderRadius: 4 },
  th: { fontSize: 12, fontWeight: '700', color: '#475569' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1 },
  td: { fontSize: 13, color: '#334155' },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
});
