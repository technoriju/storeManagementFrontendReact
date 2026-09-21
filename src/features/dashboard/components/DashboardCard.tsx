import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react-native';

export type DashboardCardVariant = 'primary' | 'secondary';

export interface DashboardCardProps {
  variant: DashboardCardVariant;
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: string;
  onViewAll?: () => void;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  variant,
  title,
  value,
  icon,
  trend,
  trendUp,
  color,
  onViewAll,
}) => {
  const theme = useTheme();

  if (variant === 'primary') {
    return (
      <View style={[styles.primaryContainer, { backgroundColor: color }]}>
        <View style={styles.primaryIconContainer}>
          {icon}
        </View>
        <View style={styles.primaryContent}>
          <Text style={styles.primaryTitle}>{title}</Text>
          <View style={styles.primaryValueRow}>
            <Text style={styles.primaryValue}>{value}</Text>
            {trend && (
              <View style={[styles.primaryBadge, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                {trendUp ? <ArrowUpRight size={12} color="#fff" /> : <ArrowDownRight size={12} color="#fff" />}
                <Text style={styles.primaryBadgeText}>{trend}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Secondary Variant
  return (
    <View style={[styles.secondaryContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.secondaryHeader}>
        <View>
          <Text style={[styles.secondaryValue, { color: theme.colors.text }]}>{value}</Text>
          <Text style={[styles.secondaryTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
        </View>
        <View style={[styles.secondaryIconContainer, { backgroundColor: color ? `${color}20` : theme.colors.background }]}>
          {icon}
        </View>
      </View>
      <View style={styles.secondaryFooter}>
        {trend && (
          <Text style={[styles.secondaryTrend, { color: trendUp ? theme.colors.success : theme.colors.error }]}>
            {trendUp ? '+' : ''}{trend} <Text style={{ color: theme.colors.textSecondary }}>vs Last Month</Text>
          </Text>
        )}
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text style={[styles.viewAllText, { color: theme.colors.textSecondary }]}>View All</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  primaryContainer: {
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 200,
    marginRight: 12,
    marginBottom: 12,
  },
  primaryIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: '#fff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  primaryContent: {
    flex: 1,
  },
  primaryTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  primaryValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
    marginLeft: 2,
  },
  secondaryContainer: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    flex: 1,
    minWidth: 200,
    marginRight: 12,
    marginBottom: 12,
  },
  secondaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  secondaryValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  secondaryTitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  secondaryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryTrend: {
    fontSize: 9,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 9,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
