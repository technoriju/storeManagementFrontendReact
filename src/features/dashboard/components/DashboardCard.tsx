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
          <View style={styles.heroHeaderLeft}>
            <View style={styles.heroIconBadge}>{icon}</View>
            <Text style={styles.heroTitle}>{title}</Text>
          </View>
          {trend && (
            <View style={styles.heroTrendBadge}>
              {trendUp ? <ArrowUpRight size={12} color="#fff" /> : <ArrowDownRight size={12} color="#fff" />}
              <Text style={styles.heroTrendText}>{trend}</Text>
            </View>
          )}
        </View>

        <View style={styles.heroValueRow}>
          <Text style={styles.heroValue}>{value}</Text>
          {onViewAll && (
            <TouchableOpacity onPress={onViewAll} style={styles.heroActionBtn} activeOpacity={0.8}>
              <Text style={styles.heroActionText}>View Details →</Text>
            </TouchableOpacity>
          )}
        </View>

        {subtitle && <Text style={styles.heroSubtitle} numberOfLines={1}>{subtitle}</Text>}
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
  // Hero Variant (Mobile Featured - 1/3 reduced height)
  heroContainer: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  heroTrendText: {
    color: '#fff',
    fontSize: 10.5,
    fontWeight: '700',
    marginLeft: 2,
  },
  heroValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroValue: {
    color: '#fff',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heroActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  heroActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '500',
  },

  // Compact Variant (Mobile 2x2 Grid - reduced height)
  compactContainer: {
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  compactTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  compactIconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  compactTrendText: {
    fontSize: 9.5,
    fontWeight: '700',
    marginLeft: 2,
  },
  compactValue: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 1,
  },
  compactTitle: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
  },
  compactSubtitle: {
    fontSize: 9.5,
    marginTop: 1,
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
