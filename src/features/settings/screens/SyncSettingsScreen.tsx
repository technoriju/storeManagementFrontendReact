import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RefreshCw, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../../shared/theme/theme';
import { outboxRepo, OutboxItem, OutboxStatus } from '../../../core/sync/outbox';
import { syncEngine } from '../../../core/sync/SyncEngine';
import { useSyncStore } from '../../../core/sync/useSyncStore';

const STATUS_COLORS: Record<OutboxStatus, { text: string; background: string }> = {
  PENDING: { text: '#B45309', background: '#FEF3C7' },
  IN_FLIGHT: { text: '#0369A1', background: '#E0F2FE' },
  FAILED: { text: '#B91C1C', background: '#FEE2E2' },
};

const UNKNOWN_STATUS_COLOR = { text: '#475569', background: '#F1F5F9' };

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

export const SyncSettingsScreen = () => {
  const theme = useTheme();
  const syncStatus = useSyncStore((state) => state.status);
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadItems = useCallback(async () => {
    setItems(await outboxRepo.getAll());
  }, []);

  useEffect(() => {
    void loadItems();
    const timer = setInterval(() => void loadItems(), 2000);
    return () => clearInterval(timer);
  }, [loadItems]);

  const refresh = async () => {
    setIsRefreshing(true);
    await syncEngine.syncNow();
    await loadItems();
    setIsRefreshing(false);
  };

  const removeItem = (item: OutboxItem) => {
    const remove = async () => {
      await outboxRepo.remove(item.id);
      await syncEngine.refreshPendingCount();
      await loadItems();
    };

    if (Platform.OS === 'web') {
      if ((globalThis as any).confirm(`Remove ${item.operation} ${item.entityType} ${item.entityId}?`)) {
        void remove();
      }
      return;
    }

    Alert.alert('Remove queue item', `Remove ${item.operation} ${item.entityType} ${item.entityId}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void remove() },
    ]);
  };

  const pending = items.filter((item) => item.status === 'PENDING').length;
  const failed = items.filter((item) => item.status === 'FAILED').length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.headingRow}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Sync queue</Text>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>Background sync jobs and retry status.</Text>
        </View>
        <Pressable style={[styles.refreshButton, { borderColor: theme.colors.border }]} onPress={() => void refresh()} disabled={isRefreshing}>
          <RefreshCw size={16} color={theme.colors.primary} />
          <Text style={[styles.refreshText, { color: theme.colors.primary }]}>{isRefreshing ? 'Syncing' : 'Sync now'}</Text>
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <Summary label="Connection" value={syncStatus} color={theme.colors.primary} theme={theme} />
        <Summary label="Queue" value={String(items.length)} color={theme.colors.text} theme={theme} />
        <Summary label="Pending" value={String(pending)} color="#B45309" theme={theme} />
        <Summary label="Failed" value={String(failed)} color="#B91C1C" theme={theme} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.table, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <View style={[styles.row, styles.headerRow, { borderBottomColor: theme.colors.border }]}>
            <Cell text="Status" width={120} muted />
            <Cell text="Operation" width={110} muted />
            <Cell text="Entity" width={130} muted />
            <Cell text="ID" width={150} muted />
            <Cell text="Retries" width={80} muted />
            <Cell text="Created" width={190} muted />
            <Cell text="Action" width={90} muted />
          </View>

          {items.length === 0 ? (
            <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>Queue empty. Background sync is clear.</Text>
          ) : items.map((item) => {
            // Existing databases can contain rows written before status was set.
            const statusColor = STATUS_COLORS[item.status] ?? UNKNOWN_STATUS_COLOR;
            return (
              <View key={item.id} style={[styles.row, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.cell}><Text style={[styles.badge, { color: statusColor.text, backgroundColor: statusColor.background }]}>{item.status}</Text></View>
                <Cell text={item.operation} width={110} />
                <Cell text={item.entityType} width={130} />
                <Cell text={item.entityId} width={150} />
                <Cell text={String(item.retryCount)} width={80} />
                <Cell text={formatDate(item.createdAt)} width={190} />
                <View style={[styles.cell, { width: 90 }]}>
                  <Pressable style={styles.deleteButton} onPress={() => removeItem(item)}>
                    <Trash2 size={15} color="#B91C1C" />
                    <Text style={styles.deleteText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ScrollView>
  );
};

const Summary = ({ label, value, color, theme }: any) => (
  <View style={[styles.summary, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
    <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.summaryValue, { color }]}>{value}</Text>
  </View>
);

const Cell = ({ text, width, muted }: { text: string; width: number; muted?: boolean }) => (
  <View style={[styles.cell, { width }]}><Text style={[styles.cellText, muted && styles.headerText]} numberOfLines={1}>{text}</Text></View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 28, gap: 20 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.6 },
  description: { fontSize: 14, marginTop: 5 },
  refreshButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 7, paddingHorizontal: 13, paddingVertical: 9 },
  refreshText: { fontSize: 13, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summary: { minWidth: 130, flexGrow: 1, borderWidth: 1, borderRadius: 8, padding: 14 },
  summaryLabel: { fontSize: 12, marginBottom: 6 },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  table: { minWidth: 870, borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  headerRow: { minHeight: 42 },
  cell: { paddingHorizontal: 12, justifyContent: 'center' },
  cellText: { fontSize: 13 },
  headerText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, fontSize: 11, fontWeight: '700' },
  empty: { padding: 24, textAlign: 'center' },
  deleteButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deleteText: { color: '#B91C1C', fontSize: 12, fontWeight: '600' },
});
