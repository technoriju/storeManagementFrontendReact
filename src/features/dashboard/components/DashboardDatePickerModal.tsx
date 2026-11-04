import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  Check,
} from 'lucide-react-native';
import { format, isSameDay } from 'date-fns';

interface DashboardDatePickerModalProps {
  visible: boolean;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}

export const DashboardDatePickerModal: React.FC<DashboardDatePickerModalProps> = ({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
}) => {
  const theme = useTheme();

  // Month navigation state
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate);

  useEffect(() => {
    if (visible) {
      setCurrentMonth(selectedDate);
    }
  }, [visible, selectedDate]);

  const today = useMemo(() => new Date(), []);

  // Format helper YYYY-MM-DD
  const formatYMD = (d: Date): string => format(d, 'yyyy-MM-dd');

  // Days matrix for the current displayed month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDays = new Date(year, month + 1, 0).getDate(); // days in month

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [currentMonth]);

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectDay = (day: Date) => {
    onSelectDate(day);
    onClose();
  };

  const handleSelectPreset = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    onSelectDate(d);
    onClose();
  };

  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}18` }]}>
                <CalendarIcon size={16} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.colors.text }]}>Choose Date</Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                  {format(selectedDate, 'EEEE, dd MMMM yyyy')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.colors.background }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Quick Presets */}
          <View style={styles.presetsRow}>
            <TouchableOpacity
              style={[
                styles.presetChip,
                isSameDay(selectedDate, today) && {
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.primary,
                },
                { borderColor: theme.colors.border },
              ]}
              onPress={() => handleSelectPreset(0)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.presetText,
                  { color: isSameDay(selectedDate, today) ? '#fff' : theme.colors.text },
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetChip,
                { borderColor: theme.colors.border },
              ]}
              onPress={() => handleSelectPreset(1)}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetText, { color: theme.colors.text }]}>Yesterday</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetChip,
                { borderColor: theme.colors.border },
              ]}
              onPress={() => handleSelectPreset(2)}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetText, { color: theme.colors.text }]}>2 Days Ago</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetChip,
                { borderColor: theme.colors.border },
              ]}
              onPress={() => handleSelectPreset(7)}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetText, { color: theme.colors.text }]}>7 Days Ago</Text>
            </TouchableOpacity>
          </View>

          {/* Month Header Navigation */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity
              onPress={prevMonth}
              style={[styles.navBtn, { borderColor: theme.colors.border }]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <ChevronLeft size={16} color={theme.colors.text} />
            </TouchableOpacity>

            <Text style={[styles.monthLabel, { color: theme.colors.text }]}>
              {format(currentMonth, 'MMMM yyyy')}
            </Text>

            <TouchableOpacity
              onPress={nextMonth}
              style={[styles.navBtn, { borderColor: theme.colors.border }]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <ChevronRight size={16} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Day of Week Labels */}
          <View style={styles.daysHeaderRow}>
            {dayLabels.map((lbl, idx) => (
              <Text
                key={idx}
                style={[
                  styles.dayLabelText,
                  { color: idx === 0 || idx === 6 ? '#F89B29' : theme.colors.textSecondary },
                ]}
              >
                {lbl}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, idx) => {
              if (!day) {
                return <View key={`empty-${idx}`} style={styles.dayCell} />;
              }

              const isSelected = isSameDay(day, selectedDate);
              const isCurrentDay = isSameDay(day, today);

              return (
                <TouchableOpacity
                  key={`day-${formatYMD(day)}`}
                  style={styles.dayCell}
                  onPress={() => handleSelectDay(day)}
                  activeOpacity={0.65}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      isSelected && { backgroundColor: theme.colors.primary },
                      !isSelected && isCurrentDay && {
                        borderWidth: 1.5,
                        borderColor: theme.colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        { color: isSelected ? '#fff' : theme.colors.text },
                        isSelected && { fontWeight: '800' },
                        !isSelected && isCurrentDay && { fontWeight: '700', color: theme.colors.primary },
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Native HTML5 date picker shortcut for Web */}
          {Platform.OS === 'web' && (
            <View style={[styles.webDateRow, { borderTopColor: theme.colors.border }]}>
              <Text style={[styles.webDateLabel, { color: theme.colors.textSecondary }]}>
                Or pick exact date:
              </Text>
              <input
                type="date"
                defaultValue={formatYMD(selectedDate)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
                    const [y, m, d] = val.split('-').map(Number);
                    handleSelectDay(new Date(y, m - 1, d));
                  }
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 7,
                  border: `1px solid ${theme.colors.border}`,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  fontSize: 12,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
            </View>
          )}

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => handleSelectPreset(0)}
              activeOpacity={0.7}
            >
              <RotateCcw size={13} color={theme.colors.primary} style={{ marginRight: 5 }} />
              <Text style={[styles.resetText, { color: theme.colors.primary }]}>Reset Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: theme.colors.primary }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Check size={14} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.doneBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 12,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '600',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  daysHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  dayLabelText: {
    width: 40,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dayCell: {
    width: 40,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 1,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: '500',
  },
  webDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: 1,
  },
  webDateLabel: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
