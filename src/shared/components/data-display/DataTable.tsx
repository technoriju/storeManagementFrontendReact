import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useResponsive } from '../../hooks/useResponsive';

export const DataTable = ({ columns, data }: any) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  if (isMobile) {
    // Render as cards on mobile
    return (
      <ScrollView style={styles.mobileContainer}>
        {data.map((row: any, i: number) => (
          <View key={i} style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, ...theme.shadows.sm, borderColor: theme.colors.border }]}>
            {columns.map((col: any) => (
              <View key={col.key} style={styles.cardRow}>
                <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>{col.title}</Text>
                <View style={styles.cardValue}>
                  {col.render ? col.render(row[col.key], row) : <Text style={{ color: theme.colors.text }}>{row[col.key]}</Text>}
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    );
  }

  // Render as table on desktop/tablet
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, ...theme.shadows.sm, borderColor: theme.colors.border }]}>
      <ScrollView horizontal>
        <View>
          <View style={[styles.row, styles.headerRow, { borderBottomColor: theme.colors.border }]}>
            {columns.map((col: any) => (
              <Text key={col.key} style={[styles.cell, { color: theme.colors.textSecondary, fontWeight: theme.typography.weights.semiBold as any, width: col.width || 120 }]}>
                {col.title}
              </Text>
            ))}
          </View>
          <ScrollView>
            {data.map((row: any, i: number) => (
              <View key={i} style={[styles.row, { borderBottomColor: theme.colors.divider, borderBottomWidth: i === data.length - 1 ? 0 : 1 }]}>
                {columns.map((col: any) => (
                  <View key={col.key} style={[styles.cell, { width: col.width || 120 }]}>
                    {col.render ? col.render(row[col.key], row) : <Text style={{ color: theme.colors.text }}>{row[col.key]}</Text>}
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { overflow: 'hidden', borderWidth: 1 },
  row: { flexDirection: 'row', borderBottomWidth: 1 },
  headerRow: { backgroundColor: 'transparent' },
  cell: { padding: 16, justifyContent: 'center' },
  
  mobileContainer: { flex: 1 },
  card: { padding: 16, marginBottom: 12, borderWidth: 1 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  cardLabel: { fontSize: 14, fontWeight: '500', flex: 1 },
  cardValue: { flex: 2, alignItems: 'flex-end' },
});
