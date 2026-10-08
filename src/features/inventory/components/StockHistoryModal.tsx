import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { X, History, ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react-native';
import { useStockTransactions } from '../api/useStock';

interface StockHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  productId?: number | string | null;
  productName?: string;
}

export const StockHistoryModal: React.FC<StockHistoryModalProps> = ({
  visible,
  onClose,
  productId,
  productName,
}) => {
  const theme = useTheme();
  const { data: transactions = [], isLoading, refetch } = useStockTransactions(productId || undefined);

  const getTypeStyle = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t.includes('ADD') || t.includes('IN') || t.includes('PURCHASE')) {
      return { bg: '#ECFDF5', text: '#10B981', isPositive: true };
    }
    if (t.includes('SUB') || t.includes('OUT') || t.includes('SALE')) {
      return { bg: '#FEF2F2', text: '#EF4444', isPositive: false };
    }
    return { bg: '#EFF6FF', text: '#3B82F6', isPositive: true };
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.headerIcon}>
                    <History size={18} color="#2563EB" />
                  </View>
                  <View>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Stock Movement Log</Text>
                    {productName ? (
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                        Product: {productName}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                        Recent inventory transactions
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={14} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View style={styles.body}>
                {isLoading ? (
                  <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                  </View>
                ) : transactions.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <History size={40} color={theme.colors.border} />
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                      No stock movement records found
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={transactions}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={{ paddingVertical: 8 }}
                    renderItem={({ item }) => {
                      const typeMeta = getTypeStyle(item.type);
                      return (
                        <View style={[styles.logItem, { borderColor: theme.colors.border }]}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <View style={[styles.typeBadge, { backgroundColor: typeMeta.bg }]}>
                                <Text style={[styles.typeBadgeText, { color: typeMeta.text }]}>
                                  {item.type.replace('_', ' ')}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                                {formatDate(item.createdAt)}
                              </Text>
                            </View>
                            <Text style={[styles.itemName, { color: theme.colors.text }]}>
                              {item.productName} {item.sku ? `(${item.sku})` : ''}
                            </Text>
                            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                              {item.reason || item.reference || 'Manual update'}
                            </Text>
                          </View>

                          <View style={styles.qtyContainer}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                              {typeMeta.isPositive ? (
                                <ArrowUpRight size={14} color="#10B981" />
                              ) : (
                                <ArrowDownLeft size={14} color="#EF4444" />
                              )}
                              <Text
                                style={[
                                  styles.qtyValue,
                                  { color: typeMeta.isPositive ? '#10B981' : '#EF4444' }
                                ]}
                              >
                                {`${typeMeta.isPositive ? '+' : '-'}${Math.abs(Number(item.quantity || 0))}`}
                              </Text>
                            </View>
                            {item.newStock > 0 && (
                              <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                                Stock: {item.newStock}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    }}
                  />
                )}
              </View>

              {/* Footer */}
              <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
                <TouchableOpacity
                  style={[styles.refreshBtn, { borderColor: theme.colors.border }]}
                  onPress={() => refetch()}
                >
                  <RefreshCw size={14} color={theme.colors.textSecondary} />
                  <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>Refresh</Text>
                </TouchableOpacity>
                <AppButton
                  title="Close"
                  onPress={onClose}
                  style={styles.closeBtn}
                  textStyle={{ color: '#FFF' }}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '85%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#EF4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    minHeight: 250,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  qtyContainer: {
    alignItems: 'flex-end',
    gap: 2,
  },
  qtyValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 36,
  },
  closeBtn: {
    backgroundColor: '#0F2847',
    borderRadius: 6,
    height: 36,
    paddingHorizontal: 20,
  },
});
