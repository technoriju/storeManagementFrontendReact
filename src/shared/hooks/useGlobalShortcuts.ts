import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useShortcutSettingsStore, normalizeKey, ShortcutItem } from '../../features/settings/store/shortcutSettings.store';

export const isShortcutMatch = (shortcut: ShortcutItem, event: any): boolean => {
  if (!shortcut.enabled) return false;

  // Check modifier keys match exactly
  const altMatches = Boolean(shortcut.altKey) === Boolean(event.altKey);
  const ctrlMatches = Boolean(shortcut.ctrlKey) === Boolean(event.ctrlKey);
  const shiftMatches = Boolean(shortcut.shiftKey) === Boolean(event.shiftKey);
  const metaMatches = Boolean(shortcut.metaKey) === Boolean(event.metaKey);

  if (!altMatches || !ctrlMatches || !shiftMatches || !metaMatches) {
    return false;
  }

  const shortcutKeyNorm = normalizeKey(shortcut.key);
  const eventKeyNorm = normalizeKey(event.key);

  // Check event.code for letter keys (e.g. KeyD -> D) to prevent Alt-symbol transformation issues on some OSes
  let codeKeyNorm = '';
  if (typeof event.code === 'string') {
    if (event.code.startsWith('Key')) {
      codeKeyNorm = event.code.slice(3).toUpperCase();
    } else if (event.code.startsWith('Digit')) {
      codeKeyNorm = event.code.slice(5);
    }
  }

  return (
    eventKeyNorm === shortcutKeyNorm ||
    (codeKeyNorm !== '' && codeKeyNorm === shortcutKeyNorm) ||
    (shortcutKeyNorm === '/' && (event.key === '/' || event.code === 'Slash')) ||
    (shortcutKeyNorm === 'SPACE' && (event.key === ' ' || event.code === 'Space'))
  );
};

export const useGlobalShortcuts = (onNavigate: (actionId: string) => void) => {
  const { shortcuts } = useShortcutSettingsStore();

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (event: any) => {
      // 1. If currently inside a key recorder or dialog recording shortcuts, ignore
      const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
      if (
        activeEl?.getAttribute('data-shortcut-recording') === 'true' ||
        activeEl?.closest?.('[data-shortcut-recorder="true"]')
      ) {
        return;
      }

      // 2. Check if typing in input/textarea without Alt/Ctrl/Function keys
      const target = event.target;
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      const hasModifier = event.altKey || event.ctrlKey || event.metaKey;
      const isFunctionKey = typeof event.key === 'string' && /^F[0-9]{1,2}$/i.test(event.key);

      // Don't trigger standard typing keys when focused in an input
      if (isInput && !hasModifier && !isFunctionKey) {
        return;
      }

      // 3. Find matching shortcut
      for (const sc of shortcuts) {
        if (isShortcutMatch(sc, event)) {
          event.preventDefault();
          event.stopPropagation();
          onNavigate(sc.actionId);
          return;
        }
      }
    };

    const globalWindow = (globalThis as any).window;
    globalWindow?.addEventListener('keydown', handleKeyDown, true);

    return () => {
      globalWindow?.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [shortcuts, onNavigate]);
};
