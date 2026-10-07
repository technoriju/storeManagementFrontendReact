import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { Calendar, X, Check, Filter } from 'lucide-react-native';

export type DatePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'week'
  | 'last7days'
  | 'month'
  | 'last_month'
  | 'quarter'
  | 'year'
  | 'custom';

export interface DateRangeState {
  preset: DatePreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  label: string;
}

interface DateFilterBarProps {
  currentRange: DateRangeState;
  onChangeRange: (newRange: DateRangeState) => void;
}

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This Week' },
  { id: 'last7days', label: 'Last 7 Days' },
  { id: 'month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'quarter', label: 'This Quarter' },
  { id: 'year', label: 'This Year' },
  { id: 'all', label: 'All Dates' },
];

export const formatToYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const computePresetDates = (preset: DatePreset): { startDate?: string; endDate?: string; label: string } => {
  const now = new Date();
  const todayStr = formatToYMD(now);

  switch (preset) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr, label: `Today (${todayStr})` };

    case 'yesterday': {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatToYMD(yest);
      return { startDate: yestStr, endDate: yestStr, label: `Yesterday (${yestStr})` };
    }

    case 'week': {
      const start = new Date(now);
      const day = start.getDay(); // 0 is Sunday
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      start.setDate(diff);
      const startStr = formatToYMD(start);
      return { startDate: startStr, endDate: todayStr, label: `This Week (${startStr} - ${todayStr})` };
    }

    case 'last7days': {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      const pastStr = formatToYMD(past);
      return { startDate: pastStr, endDate: todayStr, label: `Last 7 Days (${pastStr} - ${todayStr})` };
    }

    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: formatToYMD(start),
        endDate: formatToYMD(end),
        label: `This Month (${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()})`,
      };
    }

    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: formatToYMD(start),
        endDate: formatToYMD(end),
        label: `Last Month (${start.toLocaleString('default', { month: 'short' })} ${start.getFullYear()})`,
      };
    }

    case 'quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qMonth, 1);
      const end = new Date(now.getFullYear(), qMonth + 3, 0);
      const qNum = Math.floor(now.getMonth() / 3) + 1;
      return {
        startDate: formatToYMD(start),
        endDate: formatToYMD(end),
        label: `Q${qNum} ${now.getFullYear()} (${formatToYMD(start)} - ${formatToYMD(end)})`,
      };
    }

    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return {
        startDate: formatToYMD(start),
        endDate: formatToYMD(end),
        label: `Year ${now.getFullYear()}`,
      };
    }

    case 'all':
    default:
      return { startDate: undefined, endDate: undefined, label: 'All Recorded Dates' };
  }
};

export const DateFilterBar: React.FC<DateFilterBarProps> = ({
  currentRange,
  onChangeRange,
}) => {
  const theme = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customStart, setCustomStart] = useState(currentRange.startDate || formatToYMD(new Date()));
  const [customEnd, setCustomEnd] = useState(currentRange.endDate || formatToYMD(new Date()));
  const [customError, setCustomError] = useState('');

  const isCustomActive = currentRange.preset === 'custom';

  const handleSelectPreset = (preset: DatePreset) => {
    const { startDate, endDate, label } = computePresetDates(preset);
    onChangeRange({
      preset,
      startDate,
      endDate,
      label,
    });
  };

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) {
      setCustomError('Please enter both Start Date and End Date (YYYY-MM-DD)');
      return;
    }

    const dStart = new Date(customStart);
    const dEnd = new Date(customEnd);

    if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) {
      setCustomError('Invalid date format. Use YYYY-MM-DD');
      return;
    }

    if (dStart > dEnd) {
      setCustomError('Start Date must be before or equal to End Date');
      return;
    }

    setCustomError('');
    setIsModalOpen(false);
    onChangeRange({
      preset: 'custom',
      startDate: customStart,
      endDate: customEnd,
      label: `Custom (${customStart} to ${customEnd})`,
    });
  };

  const handleClear = () => {
    handleSelectPreset('all');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.labelGroup}>
          <Calendar size={14} color={theme.colors.textSecondary} />
          <Text style={[styles.filterGroupLabel, { color: theme.colors.textSecondary }]}>DATE:</Text>
        </View>

        {PRESETS.map((p) => {
          const isSelected = currentRange.preset === p.id;
          return (
            <Pressable
              key={p.id}
              style={[
                styles.filterPill,
                isSelected
                  ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                  : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
              onPress={() => handleSelectPreset(p.id)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  isSelected ? { color: '#FFF', fontWeight: '700' } : { color: theme.colors.text },
                ]}
              >
                {p.label}
              </Text>
            </Pressable>
          );
        })}

        {/* Custom Date Range Pill */}
        <Pressable
          style={[
            styles.filterPill,
            isCustomActive
              ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
              : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            { flexDirection: 'row', alignItems: 'center', gap: 6 },
          ]}
          onPress={() => {
            setCustomStart(currentRange.startDate || formatToYMD(new Date()));
            setCustomEnd(currentRange.endDate || formatToYMD(new Date()));
            setCustomError('');
            setIsModalOpen(true);
          }}
        >
          <Filter size={12} color={isCustomActive ? '#FFF' : theme.colors.textSecondary} />
          <Text
            style={[
              styles.filterPillText,
              isCustomActive ? { color: '#FFF', fontWeight: '700' } : { color: theme.colors.text },
            ]}
          >
            {isCustomActive ? 'Custom Range' : 'Custom...'}
          </Text>
        </Pressable>

        {/* Active badge with quick clear */}
        {currentRange.preset !== 'all' && (
          <Pressable
            style={[styles.clearBtn, { borderColor: theme.colors.border }]}
            onPress={handleClear}
          >
            <X size={12} color={theme.colors.textSecondary} />
            <Text style={[styles.clearText, { color: theme.colors.textSecondary }]}>Reset</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Custom Date Picker Modal */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.divider }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} color={theme.colors.primary} />
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Custom Date Filter</Text>
              </View>
              <Pressable onPress={() => setIsModalOpen(false)}>
                <X size={20} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>FROM DATE (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.dateInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                value={customStart}
                onChangeText={setCustomStart}
                placeholder="2026-10-01"
                placeholderTextColor={theme.colors.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginTop: 14 }]}>TO DATE (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.dateInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                value={customEnd}
                onChangeText={setCustomEnd}
                placeholder="2026-10-07"
                placeholderTextColor={theme.colors.textSecondary}
              />

              {/* Quick shortcut buttons */}
              <View style={styles.quickShortcuts}>
                <Pressable
                  style={[styles.shortcutBtn, { borderColor: theme.colors.border }]}
                  onPress={() => {
                    const todayStr = formatToYMD(new Date());
                    setCustomStart(todayStr);
                    setCustomEnd(todayStr);
                  }}
                >
                  <Text style={[styles.shortcutBtnText, { color: theme.colors.text }]}>Today</Text>
                </Pressable>
                <Pressable
                  style={[styles.shortcutBtn, { borderColor: theme.colors.border }]}
                  onPress={() => {
                    const now = new Date();
                    const past = new Date(now);
                    past.setDate(past.getDate() - 7);
                    setCustomStart(formatToYMD(past));
                    setCustomEnd(formatToYMD(now));
                  }}
                >
                  <Text style={[styles.shortcutBtnText, { color: theme.colors.text }]}>Past 7d</Text>
                </Pressable>
                <Pressable
                  style={[styles.shortcutBtn, { borderColor: theme.colors.border }]}
                  onPress={() => {
                    const now = new Date();
                    const past = new Date(now);
                    past.setDate(past.getDate() - 30);
                    setCustomStart(formatToYMD(past));
                    setCustomEnd(formatToYMD(now));
                  }}
                >
                  <Text style={[styles.shortcutBtnText, { color: theme.colors.text }]}>Past 30d</Text>
                </Pressable>
                <Pressable
                  style={[styles.shortcutBtn, { borderColor: theme.colors.border }]}
                  onPress={() => {
                    const now = new Date();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    setCustomStart(formatToYMD(startOfMonth));
                    setCustomEnd(formatToYMD(now));
                  }}
                >
                  <Text style={[styles.shortcutBtnText, { color: theme.colors.text }]}>This Month</Text>
                </Pressable>
              </View>

              {customError ? (
                <Text style={styles.errorText}>{customError}</Text>
              ) : null}
            </View>

            <View style={[styles.modalFooter, { borderTopColor: theme.colors.divider }]}>
              <Pressable
                style={[styles.cancelBtn, { borderColor: theme.colors.border }]}
                onPress={() => setIsModalOpen(false)}
              >
                <Text style={[styles.cancelBtnText, { color: theme.colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.applyBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleApplyCustom}
              >
                <Check size={16} color="#FFF" />
                <Text style={styles.applyBtnText}>Apply Filter</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '100%',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 4,
  },
  filterGroupLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  filterPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  clearText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  dateInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  quickShortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  shortcutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  shortcutBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 10,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  applyBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
