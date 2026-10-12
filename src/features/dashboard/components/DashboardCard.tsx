import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react-native';

export type DashboardCardVariant = 'primary' | 'secondary' | 'compact' | 'hero';

export interface DashboardCardProps {
  variant: DashboardCardVariant;
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
  color?: string;
  onViewAll?: () => void;
  style?: any;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  variant,
  title,
  value,
  icon,
  subtitle,
  trend,
  trendUp,
  color,
  onViewAll,
  style,
}) => {
  const theme = useTheme();

  if (variant === 'hero') {
    return (
      <View
        style={[
          styles.heroContainer,
          { backgroundColor: color || theme.colors.primary },
          style,
        ]}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroIconBadge}>{icon}</View>
          {trend && (
            <View style={styles.heroTrendBadge}>
              {trendUp ? <ArrowUpRight size={14} color="#fff" /> : <ArrowDownRight size={14} color="#fff" />}
              <Text style={styles.heroTrendText}>{trend}</Text>
            </View>
          )}
        </View>

        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroValue}>{value}</Text>

        {subtitle && <Text style={styles.heroSubtitle}>{subtitle}</Text>}

        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} style={styles.heroActionBtn} activeOpacity={0.8}>
            <Text style={styles.heroActionText}>View Details →</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (variant === 'compact') {
    const cardBg = theme.colors.surface;
    const borderCol = theme.colors.border;
    const iconBg = color ? `${color}18` : `${theme.colors.primary}18`;

    return (
      <TouchableOpacity
        activeOpacity={onViewAll ? 0.75 : 1}
        onPress={onViewAll}
        style={[
          styles.compactContainer,
          { backgroundColor: cardBg, borderColor: borderCol },
          style,
        ]}
      >
        <View style={styles.compactTopRow}>
          <View style={[styles.compactIconWrapper, { backgroundColor: iconBg }]}>
            {icon}
          </View>
          {trend && (
            <View
              style={[
                styles.compactTrendBadge,
                { backgroundColor: trendUp ? '#E6F9F4' : '#FEECEE' },
              ]}
            >
              {trendUp ? (
                <ArrowUpRight size={11} color="#00C49F" />
              ) : (
                <ArrowDownRight size={11} color="#FF4560" />
              )}
              <Text
                style={[
                  styles.compactTrendText,
                  { color: trendUp ? '#00C49F' : '#FF4560' },
                ]}
              >
                {trend}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.compactValue, { color: theme.colors.text }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[styles.compactTitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.compactSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'primary') {
    return (
      <View style={[styles.primaryContainer, { backgroundColor: color }, style]}>
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

  // Secondary Variant (Desktop)
  return (
    <View style={[styles.secondaryContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, style]}>
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
  // Hero Variant (Mobile Featured)
  heroContainer: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroTrendText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 3,
  },
  heroTitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '500',
  },
  heroActionBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Compact Variant (Mobile 2x2 Grid)
  compactContainer: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  compactTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  compactIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  compactTrendText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 2,
  },
  compactValue: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  compactTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  compactSubtitle: {
    fontSize: 10,
    marginTop: 2,
  },

  // Primary Variant (Desktop)
  primaryContainer: {
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 200,
    marginRight: 12,
    marginBottom: 12,
  },
  primaryIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  primaryContent: {
    flex: 1,
  },
  primaryTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  primaryValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryValue: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },

  // Secondary Variant (Desktop)
  secondaryContainer: {
    borderRadius: 10,
    padding: 14,
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
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  secondaryTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  secondaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryTrend: {
    fontSize: 10,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 10,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
