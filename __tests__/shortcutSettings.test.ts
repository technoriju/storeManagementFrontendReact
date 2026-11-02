import {
  useShortcutSettingsStore,
  formatShortcutKey,
  DEFAULT_SHORTCUTS,
  normalizeKey,
} from '../src/features/settings/store/shortcutSettings.store';
import { isShortcutMatch } from '../src/shared/hooks/useGlobalShortcuts';

// Mock SettingRepository
jest.mock('../src/core/repositories/SettingRepository', () => ({
  settingRepository: {
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
  },
}));

describe('Shortcut Settings Store & Matcher', () => {
  beforeEach(() => {
    useShortcutSettingsStore.getState().resetToDefaults();
  });

  test('should initialize with default shortcuts for key modules', () => {
    const { shortcuts } = useShortcutSettingsStore.getState();
    expect(shortcuts.length).toBeGreaterThanOrEqual(20);

    const dashboard = shortcuts.find((s) => s.actionId === 'dashboard');
    expect(dashboard).toBeDefined();
    expect(dashboard?.key).toBe('D');
    expect(dashboard?.altKey).toBe(true);

    const pos = shortcuts.find((s) => s.actionId === 'pos');
    expect(pos).toBeDefined();
    expect(pos?.key).toBe('S');
    expect(pos?.altKey).toBe(true);

    const products = shortcuts.find((s) => s.actionId === 'products');
    expect(products).toBeDefined();
    expect(products?.key).toBe('P');
    expect(products?.altKey).toBe(true);
  });

  test('should format shortcut keys properly', () => {
    const keyDisplay = formatShortcutKey({
      key: 'S',
      altKey: true,
      ctrlKey: false,
      shiftKey: false,
    });
    expect(keyDisplay).toBe('Alt + S');

    const complexKey = formatShortcutKey({
      key: 'P',
      altKey: true,
      ctrlKey: true,
      shiftKey: true,
    });
    expect(complexKey).toBe('Ctrl + Alt + Shift + P');
  });

  test('should detect conflicts for existing combinations', () => {
    const store = useShortcutSettingsStore.getState();
    const conflict = store.checkConflict('D', {
      altKey: true,
      ctrlKey: false,
      shiftKey: false,
    });
    expect(conflict.hasConflict).toBe(true);
    expect(conflict.conflictItem?.actionId).toBe('dashboard');

    const noConflict = store.checkConflict('Z', {
      altKey: true,
      ctrlKey: true,
      shiftKey: true,
    });
    expect(noConflict.hasConflict).toBe(false);
  });

  test('should add a new custom shortcut', () => {
    const store = useShortcutSettingsStore.getState();
    const result = store.addShortcut({
      actionId: 'custom_reports',
      label: 'Custom Reports',
      category: 'Reports',
      key: 'K',
      altKey: true,
      ctrlKey: true,
      shiftKey: false,
      enabled: true,
    });

    expect(result.success).toBe(true);
    const updated = useShortcutSettingsStore.getState().shortcuts;
    const added = updated.find((s) => s.actionId === 'custom_reports');
    expect(added).toBeDefined();
    expect(added?.isCustom).toBe(true);
  });

  test('should prevent adding a shortcut with an existing combination', () => {
    const store = useShortcutSettingsStore.getState();
    const result = store.addShortcut({
      actionId: 'another_dash',
      label: 'Another Dashboard',
      category: 'Main',
      key: 'D',
      altKey: true,
      ctrlKey: false,
      shiftKey: false,
      enabled: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('already used');
  });

  test('should update an existing shortcut', () => {
    const store = useShortcutSettingsStore.getState();
    const dashboard = store.shortcuts.find((s) => s.actionId === 'dashboard');
    expect(dashboard).toBeDefined();

    const updateRes = store.updateShortcut(dashboard!.id, {
      key: 'W',
      altKey: true,
      ctrlKey: true,
      shiftKey: false,
    });

    expect(updateRes.success).toBe(true);
    const updatedDashboard = useShortcutSettingsStore.getState().shortcuts.find((s) => s.id === dashboard!.id);
    expect(updatedDashboard?.key).toBe('W');
    expect(updatedDashboard?.ctrlKey).toBe(true);
  });

  test('should delete a shortcut', () => {
    const store = useShortcutSettingsStore.getState();
    const initialCount = store.shortcuts.length;
    const firstId = store.shortcuts[0].id;

    store.deleteShortcut(firstId);
    const afterCount = useShortcutSettingsStore.getState().shortcuts.length;
    expect(afterCount).toBe(initialCount - 1);
  });

  test('should correctly match keyboard events via isShortcutMatch', () => {
    const shortcut = {
      id: 'sc_test',
      actionId: 'test_action',
      label: 'Test Action',
      category: 'Sales' as const,
      key: 'S',
      altKey: true,
      ctrlKey: false,
      shiftKey: false,
      enabled: true,
    };

    expect(
      isShortcutMatch(shortcut, {
        key: 's',
        altKey: true,
        ctrlKey: false,
        shiftKey: false,
        metaKey: false,
      })
    ).toBe(true);

    expect(
      isShortcutMatch(shortcut, {
        key: 'S',
        altKey: true,
        ctrlKey: false,
        shiftKey: false,
        metaKey: false,
      })
    ).toBe(true);

    // Should not match if Ctrl is pressed
    expect(
      isShortcutMatch(shortcut, {
        key: 's',
        altKey: true,
        ctrlKey: true,
        shiftKey: false,
        metaKey: false,
      })
    ).toBe(false);

    // Should not match if disabled
    expect(
      isShortcutMatch(
        { ...shortcut, enabled: false },
        {
          key: 's',
          altKey: true,
          ctrlKey: false,
          shiftKey: false,
          metaKey: false,
        }
      )
    ).toBe(false);
  });
});
