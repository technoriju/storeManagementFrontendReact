import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AdvancedTable, AdvancedTableColumn } from '../../../shared/components/data-display/AdvancedTable';
import { AppDialog } from '../../../shared/components/feedback/AppDialog';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { Holiday } from '../../../types/models';
import {
  Calendar,
  PlusCircle,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sun,
  Award,
  X,
} from 'lucide-react-native';
import {
  useHolidays,
  useAddHoliday,
  useDeleteHoliday,
} from '../api/useHolidays';

export const HolidayScreen: React.FC = () => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const { data: holidays = [], isLoading } = useHolidays();
  const addHolidayMutation = useAddHoliday();
  const deleteHolidayMutation = useDeleteHoliday();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PUBLIC' | 'COMPANY' | 'OPTIONAL'>('ALL');
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [holidayType, setHolidayType] = useState<'PUBLIC' | 'COMPANY' | 'OPTIONAL'>('PUBLIC');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  // KPIs
  const kpis = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const total = holidays.length;
    const upcoming = holidays.filter((h) => h.date >= today).length;
    const publicCount = holidays.filter((h) => h.type === 'PUBLIC').length;
    return { total, upcoming, publicCount };
  }, [holidays]);

  const typeOptions = [
    { label: 'All Holidays', value: 'ALL' },
    { label: 'Public Holidays', value: 'PUBLIC' },
    { label: 'Company Holidays', value: 'COMPANY' },
    { label: 'Optional Holidays', value: 'OPTIONAL' },
  ];

  // Filtered holidays
  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => {
      if (!h) return false;
      const name = (h.name || '').toLowerCase();
      const dateStr = h.date || '';
      const desc = (h.description || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchSearch =
        name.includes(q) ||
        dateStr.includes(q) ||
        desc.includes(q);

      const matchType = typeFilter === 'ALL' || h.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [holidays, searchQuery, typeFilter]);

  const handleOpenAdd = () => {
    setName('');
    setDate(new Date().toISOString().split('T')[0]);
    setHolidayType('PUBLIC');
    setDescription('');
    setFormError('');
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError('Holiday name is required');
      return;
    }
    if (!date.trim()) {
      setFormError('Date is required');
      return;
    }

    try {
      await addHolidayMutation.mutateAsync({
        name: name.trim(),
        date: date.trim(),
        type: holidayType,
        description: description.trim(),
        status: 'ACTIVE',
      });
      setIsModalVisible(false);
    } catch (err: any) {
      setFormError(err?.message || 'Error creating holiday');
    }
  };

  const handleDelete = (holiday: Holiday) => {
    const doDelete = async () => {
      try {
        await deleteHolidayMutation.mutateAsync(holiday.id);
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to delete');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete holiday "${holiday.name}"?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Confirm Delete', `Delete holiday "${holiday.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const columns: AdvancedTableColumn<Holiday>[] = [
    {
      key: 'date',
      title: 'Date',
      width: 140,
      render: (val: string, item: Holiday) => (
        <View>
          <Text style={[styles.cellTextBold, { color: theme.colors.text }]}>{val}</Text>
          <Text style={[styles.cellTextSmall, { color: theme.colors.textSecondary }]}>
            {item.dayOfWeek || 'Weekday'}
          </Text>
        </View>
      ),
    },
    {
      key: 'name',
      title: 'Holiday Name',
      flex: 1,
      minWidth: 160,
      render: (val: string, item: Holiday) => (
        <View>
          <Text style={[styles.cellTextBold, { color: theme.colors.text }]}>{val}</Text>
          {item.description ? (
            <Text style={[styles.cellTextSmall, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
        </View>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      width: 130,
      render: (val: string) => {
        const isPublic = val === 'PUBLIC';
        return (
          <View style={[styles.typeBadge, { backgroundColor: isPublic ? '#ECFDF5' : '#EEF2FF' }]}>
            <Text style={[styles.typeText, { color: isPublic ? '#10B981' : '#4F46E5' }]}>
              {val}
            </Text>
          </View>
        );
      },
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Calendar size={24} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.title, { color: theme.colors.text }]}>Holidays Calendar</Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Official company holiday schedules and public observances
          </Text>
        </View>

        <AppButton
          title="Add Holiday"
          icon={<PlusCircle size={18} color="#FFFFFF" />}
          onPress={handleOpenAdd}
          style={styles.addButton}
        />
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiCard, styles.kpiCardBlue]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#DBEAFE' }]}>
              <Calendar size={18} color="#2563EB" />
            </View>
            <View style={styles.kpiTextCol}>
              <Text style={[styles.kpiLabel, { color: '#1E40AF' }]}>Total Holidays</Text>
              <Text style={[styles.kpiValue, { color: '#1E3A8A' }]}>{kpis.total}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, styles.kpiCardGreen]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Sun size={18} color="#16A34A" />
            </View>
            <View style={styles.kpiTextCol}>
              <Text style={[styles.kpiLabel, { color: '#166534' }]}>Upcoming</Text>
              <Text style={[styles.kpiValue, { color: '#14532D' }]}>{kpis.upcoming}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.kpiCard, styles.kpiCardOrange]}>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FFEDD5' }]}>
              <Award size={18} color="#EA580C" />
            </View>
            <View style={styles.kpiTextCol}>
              <Text style={[styles.kpiLabel, { color: '#9A3412' }]}>Public Holidays</Text>
              <Text style={[styles.kpiValue, { color: '#7C2D12' }]}>{kpis.publicCount}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main Table */}
      <View style={styles.tableContainer}>
        <AdvancedTable
          data={filteredHolidays}
          columns={columns}
          isLoading={isLoading}
          searchPlaceholder="Search holidays by name or date..."
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          filters={
            <View style={styles.tableFiltersRow}>
              <View style={styles.typeSelectWrapper}>
                <AppSelect
                  placeholder="Filter by Classification"
                  value={typeFilter}
                  options={typeOptions}
                  onSelect={(val) => setTypeFilter((val as any) || 'ALL')}
                  containerStyle={styles.tableSelectContainer}
                />
              </View>
              {typeFilter !== 'ALL' && (
                <Pressable onPress={() => setTypeFilter('ALL')} style={styles.resetFilterBtn}>
                  <X size={14} color="#64748B" />
                  <Text style={styles.resetFilterText}>Reset</Text>
                </Pressable>
              )}
            </View>
          }
          renderRowActions={(item) => (
            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => handleDelete(item)}
                style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}
              >
                <Trash2 size={15} color="#EF4444" />
              </Pressable>
            </View>
          )}
          renderMobileCard={(item) => (
            <View style={[styles.mobileCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.mobileCardHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.name}</Text>
                  <Text style={[styles.cardCode, { color: theme.colors.primary }]}>
                    {item.date} ({item.dayOfWeek || 'Day'})
                  </Text>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: item.type === 'PUBLIC' ? '#ECFDF5' : '#EEF2FF' }]}>
                  <Text style={[styles.typeText, { color: item.type === 'PUBLIC' ? '#10B981' : '#4F46E5' }]}>
                    {item.type}
                  </Text>
                </View>
              </View>

              {item.description ? (
                <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]}>{item.description}</Text>
              ) : null}

              <View style={styles.mobileCardFooter}>
                <Pressable onPress={() => handleDelete(item)} style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}>
                  <Trash2 size={15} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          )}
        />
      </View>

      {/* Add Holiday Dialog */}
      <AppDialog
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="Add Company Holiday"
        maxWidth={500}
        compact={true}
        actions={
          <View style={styles.dialogActionsRow}>
            <AppButton
              title="Cancel"
              variant="outline"
              onPress={() => setIsModalVisible(false)}
              style={styles.dialogBtn}
            />
            <AppButton
              title="Add Holiday"
              onPress={handleSave}
              isLoading={addHolidayMutation.isPending}
              style={styles.dialogBtn}
            />
          </View>
        }
      >
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {formError ? (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#DC2626" />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          <AppInput
            label="Holiday Name *"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Independence Day"
          />

          <AppInput
            label="Date (YYYY-MM-DD) *"
            value={date}
            onChangeText={setDate}
            placeholder="2026-07-04"
          />

          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Holiday Classification</Text>
            <View style={styles.typeToggleRow}>
              {(['PUBLIC', 'COMPANY', 'OPTIONAL'] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[
                    styles.toggleBtn,
                    holidayType === t && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setHolidayType(t)}
                >
                  <Text style={[styles.toggleBtnText, { color: holidayType === t ? '#FFFFFF' : theme.colors.text }]}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <AppInput
            label="Description / Details"
            value={description}
            onChangeText={setDescription}
            placeholder="Additional notes about this holiday"
            multiline
            numberOfLines={3}
          />
        </ScrollView>
      </AppDialog>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    minWidth: 140,
  },
  kpiContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 140,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  kpiCardBlue: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  kpiCardGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  kpiCardOrange: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  kpiIconBox: {
    width: 34,
    height: 34,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiTextCol: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 1,
  },
  tableFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  typeSelectWrapper: {
    minWidth: 180,
  },
  tableSelectContainer: {
    marginBottom: 0,
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  resetFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  dialogActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  dialogBtn: {
    minWidth: 110,
  },
  tableContainer: {
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cellTextBold: {
    fontSize: 14,
    fontWeight: '600',
  },
  cellTextSmall: {
    fontSize: 12,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mobileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardCode: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  cardDesc: {
    fontSize: 13,
    marginTop: 6,
  },
  mobileCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalContent: {
    maxHeight: 480,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
  },
  formGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  typeToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
  },
});
