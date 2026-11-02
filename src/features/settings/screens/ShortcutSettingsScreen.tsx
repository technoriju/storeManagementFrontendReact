import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import {
  useShortcutSettingsStore,
  ShortcutItem,
  AVAILABLE_MODULES,
  AvailableModule,
  formatShortcutKey,
  normalizeKey,
} from '../store/shortcutSettings.store';
import { AppDialog } from '../../../shared/components/feedback/AppDialog';
import { SweetConfirmModal } from '../../../shared/components/feedback/SweetConfirmModal';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import {
  Keyboard,
  Plus,
  RotateCcw,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Command,
  Layout,
  Tag,
  Zap,
} from 'lucide-react-native';

const CATEGORIES = [
  'All',
  'Main',
  'Sales',
  'Inventory',
  'Stock',
  'Purchases',
  'Peoples',
  'Finance',
  'HRM',
  'Reports',
  'Settings',
  'User Management',
  'Custom',
];

const KeyBadge: React.FC<{ keys: string }> = ({ keys }) => {
  const parts = keys.split(' + ');
  return (
    <View style={styles.badgeRow}>
      {parts.map((part, idx) => (
        <React.Fragment key={idx}>
          <View style={styles.keyCap}>
            <Text style={styles.keyCapText}>{part}</Text>
          </View>
          {idx < parts.length - 1 && <Text style={styles.keyCapPlus}>+</Text>}
        </React.Fragment>
      ))}
    </View>
  );
};

export const ShortcutSettingsScreen: React.FC = () => {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const {
    shortcuts,
    showShortcutBadges,
    setShowShortcutBadges,
    addShortcut,
    updateShortcut,
    deleteShortcut,
    toggleShortcut,
    resetToDefaults,
    checkConflict,
  } = useShortcutSettingsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<ShortcutItem | null>(null);

  // Form State
  const [formActionId, setFormActionId] = useState('dashboard');
  const [formLabel, setFormLabel] = useState('');
  const [formCategory, setFormCategory] = useState<ShortcutItem['category']>('Main');
  const [formDescription, setFormDescription] = useState('');
  const [formKey, setFormKey] = useState('D');
  const [formAlt, setFormAlt] = useState(true);
  const [formCtrl, setFormCtrl] = useState(false);
  const [formShift, setFormShift] = useState(false);
  const [formEnabled, setFormEnabled] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Delete & Reset Confirmation Modals
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const recorderRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Filtered Shortcuts
  const filteredShortcuts = useMemo(() => {
    return shortcuts.filter((sc) => {
      const matchesSearch =
        sc.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sc.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formatShortcutKey(sc).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sc.description && sc.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'All'
          ? true
          : selectedCategory === 'Custom'
          ? sc.isCustom
          : sc.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [shortcuts, searchQuery, selectedCategory]);

  // Real-time conflict checking in form
  const conflictCheck = useMemo(() => {
    if (!formKey) return { hasConflict: false };
    return checkConflict(
      formKey,
      { altKey: formAlt, ctrlKey: formCtrl, shiftKey: formShift },
      editingShortcut?.id
    );
  }, [formKey, formAlt, formCtrl, formShift, editingShortcut, checkConflict]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingShortcut(null);
    setFormActionId(AVAILABLE_MODULES[0]?.id || 'dashboard');
    setFormLabel(AVAILABLE_MODULES[0]?.label || 'Dashboard');
    setFormCategory(AVAILABLE_MODULES[0]?.category || 'Main');
    setFormDescription(AVAILABLE_MODULES[0]?.description || '');
    setFormKey('');
    setFormAlt(true);
    setFormCtrl(false);
    setFormShift(false);
    setFormEnabled(true);
    setFormError(null);
    setIsRecording(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (sc: ShortcutItem) => {
    setEditingShortcut(sc);
    setFormActionId(sc.actionId);
    setFormLabel(sc.label);
    setFormCategory(sc.category);
    setFormDescription(sc.description || '');
    setFormKey(sc.key);
    setFormAlt(Boolean(sc.altKey));
    setFormCtrl(Boolean(sc.ctrlKey));
    setFormShift(Boolean(sc.shiftKey));
    setFormEnabled(sc.enabled);
    setFormError(null);
    setIsRecording(false);
    setIsModalOpen(true);
  };

  // Module change in form
  const handleModuleChange = (modId: string) => {
    setFormActionId(modId);
    const mod = AVAILABLE_MODULES.find((m) => m.id === modId);
    if (mod) {
      setFormLabel(mod.label);
      setFormCategory(mod.category);
      if (!editingShortcut) {
        setFormDescription(mod.description);
      }
    }
  };

  // Keyboard capture in form for quick recorder
  useEffect(() => {
    if (!isRecording || Platform.OS !== 'web') return;

    const handleKeyCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't record standalone modifier presses
      if (['Alt', 'Control', 'Shift', 'Meta'].includes(e.key)) {
        return;
      }

      let capturedKey = e.key;
      if (e.code.startsWith('Key')) {
        capturedKey = e.code.slice(3).toUpperCase();
      } else if (e.code.startsWith('Digit')) {
        capturedKey = e.code.slice(5);
      } else if (e.key === ' ') {
        capturedKey = 'Space';
      } else {
        capturedKey = normalizeKey(e.key);
      }

      setFormKey(capturedKey);
      setFormAlt(e.altKey);
      setFormCtrl(e.ctrlKey);
      setFormShift(e.shiftKey);
      setIsRecording(false);
    };

    const targetWindow = (globalThis as any).window;
    targetWindow?.addEventListener('keydown', handleKeyCapture, true);

    return () => {
      targetWindow?.removeEventListener('keydown', handleKeyCapture, true);
    };
  }, [isRecording]);

  // Save Modal
  const handleSaveForm = () => {
    setFormError(null);
    const normKey = normalizeKey(formKey);

    if (!normKey) {
      setFormError('Please choose or record a hotkey.');
      return;
    }

    if (!formAlt && !formCtrl && !/^F[0-9]{1,2}$/i.test(normKey)) {
      setFormError('Please include at least Alt, Ctrl, or a Function key (F1-F12).');
      return;
    }

    if (conflictCheck.hasConflict && conflictCheck.conflictItem) {
      setFormError(`Conflict: Already assigned to "${conflictCheck.conflictItem.label}".`);
      return;
    }

    if (editingShortcut) {
      const res = updateShortcut(editingShortcut.id, {
        actionId: formActionId,
        label: formLabel,
        category: formCategory,
        description: formDescription,
        key: normKey,
        altKey: formAlt,
        ctrlKey: formCtrl,
        shiftKey: formShift,
        enabled: formEnabled,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to update shortcut.');
        return;
      }
      showToast(`Updated shortcut for ${formLabel}`);
    } else {
      const res = addShortcut({
        actionId: formActionId,
        label: formLabel,
        category: formCategory,
        description: formDescription,
        key: normKey,
        altKey: formAlt,
        ctrlKey: formCtrl,
        shiftKey: formShift,
        enabled: formEnabled,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to add shortcut.');
        return;
      }
      showToast(`Added shortcut for ${formLabel}`);
    }

    setIsModalOpen(false);
  };

  // Stats
  const totalCount = shortcuts.length;
  const activeCount = shortcuts.filter((s) => s.enabled).length;
  const customCount = shortcuts.filter((s) => s.isCustom).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '18' }]}>
                <Keyboard size={24} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.colors.text }]}>
                  Keyboard Shortcuts
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                  Navigate and execute important modules instantly across your billing workflow.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.resetBtn, { borderColor: theme.colors.border }]}
              onPress={() => setShowResetConfirm(true)}
            >
              <RotateCcw size={15} color={theme.colors.textSecondary} />
              <Text style={[styles.actionBtnText, { color: theme.colors.textSecondary }]}>
                Reset Defaults
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
              onPress={handleOpenAdd}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={[styles.actionBtnText, { color: '#FFFFFF', fontWeight: '600' }]}>
                Add Shortcut
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Toast Alert */}
        {toastMessage && (
          <View style={[styles.toastBanner, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
            <CheckCircle size={18} color="#059669" />
            <Text style={{ color: '#065F46', marginLeft: 8, fontWeight: '500' }}>
              {toastMessage}
            </Text>
          </View>
        )}

        {/* Stats & Quick Toggle Bar */}
        <View style={[styles.statsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{totalCount}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Hotkeys</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{activeCount}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Active / Enabled</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{customCount}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Custom Hotkeys</Text>
            </View>
          </View>

          <View style={[styles.badgeToggleRow, { borderTopColor: theme.colors.border }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.badgeToggleTitle, { color: theme.colors.text }]}>
                Show Hotkey Badges in Sidebar
              </Text>
              <Text style={[styles.badgeToggleSubtitle, { color: theme.colors.textSecondary }]}>
                Displays visual tags like [Alt+S] next to menu items in the main sidebar.
              </Text>
            </View>
            <Switch
              value={showShortcutBadges}
              onValueChange={setShowShortcutBadges}
              trackColor={{ false: '#CBD5E1', true: theme.colors.primary + '80' }}
              thumbColor={showShortcutBadges ? theme.colors.primary : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Filter and Search Bar */}
        <View style={styles.filterSection}>
          <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Search size={18} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search shortcut by module name, key (e.g. 'Alt + S' or 'POS')..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: isSelected ? '#FFFFFF' : theme.colors.text },
                      isSelected && { fontWeight: '600' },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Shortcuts List / Table */}
        <View style={[styles.tableContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {/* Table Header for wide screens */}
          {!isMobile && (
            <View style={[styles.tableHeaderRow, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
              <Text style={[styles.tableHeaderCell, { flex: 2, color: theme.colors.textSecondary }]}>
                MODULE & DESCRIPTION
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, color: theme.colors.textSecondary }]}>
                CATEGORY
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5, color: theme.colors.textSecondary }]}>
                HOTKEY COMBINATION
              </Text>
              <Text style={[styles.tableHeaderCell, { width: 90, textAlign: 'center', color: theme.colors.textSecondary }]}>
                STATUS
              </Text>
              <Text style={[styles.tableHeaderCell, { width: 100, textAlign: 'right', color: theme.colors.textSecondary }]}>
                ACTIONS
              </Text>
            </View>
          )}

          {filteredShortcuts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <HelpCircle size={36} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No shortcuts found
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Try a different search term or category filter, or click "Add Shortcut" to create one.
              </Text>
            </View>
          ) : (
            filteredShortcuts.map((sc, index) => {
              const keyFormatted = formatShortcutKey(sc);
              const isLast = index === filteredShortcuts.length - 1;

              if (isMobile) {
                return (
                  <View
                    key={sc.id}
                    style={[
                      styles.mobileCard,
                      !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
                    ]}
                  >
                    <View style={styles.mobileCardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.moduleTitle, { color: theme.colors.text }]}>
                            {sc.label}
                          </Text>
                          {sc.isCustom && (
                            <View style={styles.customBadge}>
                              <Text style={styles.customBadgeText}>Custom</Text>
                            </View>
                          )}
                        </View>
                        {sc.description ? (
                          <Text style={[styles.moduleDesc, { color: theme.colors.textSecondary }]}>
                            {sc.description}
                          </Text>
                        ) : null}
                      </View>
                      <Switch
                        value={sc.enabled}
                        onValueChange={(val) => toggleShortcut(sc.id, val)}
                        trackColor={{ false: '#CBD5E1', true: theme.colors.primary + '80' }}
                        thumbColor={sc.enabled ? theme.colors.primary : '#FFFFFF'}
                      />
                    </View>

                    <View style={styles.mobileCardFooter}>
                      <KeyBadge keys={keyFormatted} />
                      <View style={styles.actionsRow}>
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => handleOpenEdit(sc)}
                        >
                          <Edit2 size={16} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => setDeleteConfirmId(sc.id)}
                        >
                          <Trash2 size={16} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              }

              return (
                <View
                  key={sc.id}
                  style={[
                    styles.tableRow,
                    !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
                    !sc.enabled && { opacity: 0.55 },
                  ]}
                >
                  <View style={{ flex: 2, paddingRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.moduleTitle, { color: theme.colors.text }]}>
                        {sc.label}
                      </Text>
                      {sc.isCustom && (
                        <View style={styles.customBadge}>
                          <Text style={styles.customBadgeText}>Custom</Text>
                        </View>
                      )}
                    </View>
                    {sc.description ? (
                      <Text
                        numberOfLines={1}
                        style={[styles.moduleDesc, { color: theme.colors.textSecondary }]}
                      >
                        {sc.description}
                      </Text>
                    ) : null}
                  </View>

                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <View style={[styles.categoryPill, { backgroundColor: theme.colors.background }]}>
                      <Text style={[styles.categoryPillText, { color: theme.colors.textSecondary }]}>
                        {sc.category}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flex: 1.5, paddingRight: 12 }}>
                    <KeyBadge keys={keyFormatted} />
                  </View>

                  <View style={{ width: 90, alignItems: 'center' }}>
                    <Switch
                      value={sc.enabled}
                      onValueChange={(val) => toggleShortcut(sc.id, val)}
                      trackColor={{ false: '#CBD5E1', true: theme.colors.primary + '80' }}
                      thumbColor={sc.enabled ? theme.colors.primary : '#FFFFFF'}
                    />
                  </View>

                  <View style={[styles.actionsRow, { width: 100, justifyContent: 'flex-end' }]}>
                    <TouchableOpacity
                      style={[styles.actionIconBtn, { backgroundColor: theme.colors.background }]}
                      onPress={() => handleOpenEdit(sc)}
                      title="Edit Shortcut"
                    >
                      <Edit2 size={15} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionIconBtn, { backgroundColor: '#FEE2E2', marginLeft: 8 }]}
                      onPress={() => setDeleteConfirmId(sc.id)}
                      title="Delete Shortcut"
                    >
                      <Trash2 size={15} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Quick Reference Tip Card */}
        <View style={[styles.tipCard, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
          <Zap size={20} color="#0284C7" style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: '#0369A1', fontWeight: '700', fontSize: 14 }}>
              Pro Tips for Faster Navigation
            </Text>
            <Text style={{ color: '#0C4A6E', fontSize: 13, marginTop: 4, lineHeight: 18 }}>
              • All hotkeys can be triggered anywhere within the billing app on desktop or web.
              {'\n'}• Press <Text style={{ fontWeight: '600' }}>Alt + /</Text> at any time to open this Keyboard Shortcuts settings.
              {'\n'}• Shortcuts are saved offline to your local storage and sync across your sessions.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Add / Edit Dialog Modal */}
      <AppDialog
        visible={isModalOpen}
        title={editingShortcut ? `Edit Shortcut: ${editingShortcut.label}` : 'Add New Shortcut'}
        onClose={() => setIsModalOpen(false)}
        maxWidth={520}
      >
        <View style={styles.modalBody}>
          {/* Module Selector */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: theme.colors.text }]}>Target Module / Page</Text>
            <ScrollView
              style={[styles.modulePickerScroll, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              nestedScrollEnabled
            >
              {AVAILABLE_MODULES.map((mod) => {
                const isSelected = formActionId === mod.id;
                return (
                  <TouchableOpacity
                    key={mod.id}
                    style={[
                      styles.modulePickerItem,
                      isSelected && { backgroundColor: theme.colors.primary + '18' },
                    ]}
                    onPress={() => handleModuleChange(mod.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.modulePickerItemLabel,
                          { color: isSelected ? theme.colors.primary : theme.colors.text },
                          isSelected && { fontWeight: '700' },
                        ]}
                      >
                        {mod.label}
                      </Text>
                      <Text style={[styles.modulePickerItemDesc, { color: theme.colors.textSecondary }]}>
                        {mod.description}
                      </Text>
                    </View>
                    <View style={[styles.modulePickerCategory, { backgroundColor: theme.colors.surface }]}>
                      <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                        {mod.category}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Key Combination Section */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: theme.colors.text }]}>
              Hotkey Combination
            </Text>

            {/* Interactive Recorder Box */}
            <TouchableOpacity
              style={[
                styles.recorderBox,
                {
                  borderColor: isRecording ? theme.colors.primary : theme.colors.border,
                  backgroundColor: isRecording ? theme.colors.primary + '0A' : theme.colors.surface,
                },
              ]}
              onPress={() => setIsRecording(true)}
              data-shortcut-recording={isRecording ? 'true' : 'false'}
              activeOpacity={0.8}
            >
              {isRecording ? (
                <View style={styles.recordingPrompt}>
                  <Zap size={18} color={theme.colors.primary} />
                  <Text style={[styles.recordingPromptText, { color: theme.colors.primary }]}>
                    Press keys on your keyboard now... (e.g. Alt + S)
                  </Text>
                </View>
              ) : formKey ? (
                <View style={{ alignItems: 'center' }}>
                  <KeyBadge
                    keys={formatShortcutKey({
                      key: formKey,
                      altKey: formAlt,
                      ctrlKey: formCtrl,
                      shiftKey: formShift,
                    })}
                  />
                  <Text style={[styles.recorderClickHint, { color: theme.colors.textSecondary }]}>
                    Click here to record a different combination
                  </Text>
                </View>
              ) : (
                <View style={styles.recordingPrompt}>
                  <Keyboard size={18} color={theme.colors.textSecondary} />
                  <Text style={[styles.recordingPromptText, { color: theme.colors.textSecondary }]}>
                    Click to record key combination
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Manual Modifier Checkboxes */}
            <View style={styles.modifierRow}>
              <TouchableOpacity
                style={[
                  styles.modifierToggle,
                  {
                    backgroundColor: formAlt ? theme.colors.primary : theme.colors.surface,
                    borderColor: formAlt ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setFormAlt(!formAlt)}
              >
                <Text
                  style={[
                    styles.modifierToggleText,
                    { color: formAlt ? '#FFFFFF' : theme.colors.text },
                  ]}
                >
                  Alt
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modifierToggle,
                  {
                    backgroundColor: formCtrl ? theme.colors.primary : theme.colors.surface,
                    borderColor: formCtrl ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setFormCtrl(!formCtrl)}
              >
                <Text
                  style={[
                    styles.modifierToggleText,
                    { color: formCtrl ? '#FFFFFF' : theme.colors.text },
                  ]}
                >
                  Ctrl
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modifierToggle,
                  {
                    backgroundColor: formShift ? theme.colors.primary : theme.colors.surface,
                    borderColor: formShift ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setFormShift(!formShift)}
              >
                <Text
                  style={[
                    styles.modifierToggleText,
                    { color: formShift ? '#FFFFFF' : theme.colors.text },
                  ]}
                >
                  Shift
                </Text>
              </TouchableOpacity>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <TextInput
                  style={[
                    styles.manualKeyInput,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="Key (e.g. D, F2, /)"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={formKey}
                  onChangeText={(val) => setFormKey(normalizeKey(val))}
                  maxLength={5}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Conflict Warning */}
            {conflictCheck.hasConflict && conflictCheck.conflictItem && (
              <View style={[styles.conflictAlert, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                <AlertCircle size={16} color="#D97706" />
                <Text style={{ color: '#B45309', fontSize: 13, marginLeft: 8, flex: 1 }}>
                  This combination is already used for <Text style={{ fontWeight: '700' }}>"{conflictCheck.conflictItem.label}"</Text>.
                </Text>
              </View>
            )}

            {/* General form error */}
            {formError && (
              <View style={[styles.conflictAlert, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
                <AlertCircle size={16} color="#DC2626" />
                <Text style={{ color: '#B91C1C', fontSize: 13, marginLeft: 8, flex: 1 }}>
                  {formError}
                </Text>
              </View>
            )}
          </View>

          {/* Description / Notes */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: theme.colors.text }]}>Description (Optional)</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                },
              ]}
              placeholder="e.g. Quick jump to POS terminal"
              placeholderTextColor={theme.colors.textSecondary}
              value={formDescription}
              onChangeText={setFormDescription}
            />
          </View>

          {/* Modal Actions */}
          <View style={styles.modalActionRow}>
            <TouchableOpacity
              style={[styles.modalCancelBtn, { borderColor: theme.colors.border }]}
              onPress={() => setIsModalOpen(false)}
            >
              <Text style={{ color: theme.colors.textSecondary, fontWeight: '500' }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalSaveBtn,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: conflictCheck.hasConflict ? 0.6 : 1,
                },
              ]}
              onPress={handleSaveForm}
              disabled={conflictCheck.hasConflict}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Save Shortcut</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppDialog>

      {/* Delete Confirmation Modal */}
      <SweetConfirmModal
        visible={!!deleteConfirmId}
        title="Delete Shortcut"
        description="Are you sure you want to remove this keyboard shortcut? You can re-add it or reset to default at any time."
        type="danger"
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={() => {
          if (deleteConfirmId) {
            deleteShortcut(deleteConfirmId);
            setDeleteConfirmId(null);
            showToast('Shortcut removed.');
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* Reset Confirmation Modal */}
      <SweetConfirmModal
        visible={showResetConfirm}
        title="Reset All Shortcuts to Defaults"
        description="This will restore all default system hotkeys (Alt+D for Dashboard, Alt+S for POS, Alt+P for Products, etc.) and remove customized combinations."
        type="warning"
        confirmText="Reset to Defaults"
        cancelText="Cancel"
        onConfirm={() => {
          resetToDefaults();
          setShowResetConfirm(false);
          showToast('All shortcuts restored to factory defaults.');
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  resetBtn: {
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  primaryBtn: {
    elevation: 1,
  },
  actionBtnText: {
    fontSize: 13,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  statsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  badgeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
  },
  badgeToggleTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  badgeToggleSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  filterSection: {
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
  },
  tableContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  moduleDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  customBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  customBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4F46E5',
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  keyCap: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderBottomWidth: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyCapText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  keyCapPlus: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginHorizontal: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileCard: {
    padding: 16,
  },
  mobileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mobileCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  tipCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  // Modal Body Styles
  modalBody: {
    paddingTop: 8,
  },
  formGroup: {
    marginBottom: 18,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  modulePickerScroll: {
    maxHeight: 180,
    borderWidth: 1,
    borderRadius: 8,
  },
  modulePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modulePickerItemLabel: {
    fontSize: 13,
  },
  modulePickerItemDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  modulePickerCategory: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  recorderBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  recordingPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingPromptText: {
    fontSize: 13,
    fontWeight: '500',
  },
  recorderClickHint: {
    fontSize: 11,
    marginTop: 6,
  },
  modifierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modifierToggle: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
  },
  modifierToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  manualKeyInput: {
    borderWidth: 1,
    borderRadius: 6,
    height: 38,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  conflictAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 10,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 6,
    height: 40,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
  },
  modalSaveBtn: {
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
});
