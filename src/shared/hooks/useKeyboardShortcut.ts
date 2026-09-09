import { useEffect } from 'react';
import { Platform } from 'react-native';

export const useKeyboardShortcut = (
  key: string,
  callback: () => void,
  options = { ctrlKey: false, altKey: false, shiftKey: false }
) => {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (event: any) => {
      // Don't trigger if the user is typing in an input, UNLESS it's a function key
      const target = event.target;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      
      const isFunctionKey = typeof event.key === 'string' && event.key.startsWith('F') && event.key.length > 1;

      if (isInput && !isFunctionKey) {
         return;
      }

      if (
        event.key?.toLowerCase() === key.toLowerCase() &&
        event.ctrlKey === options.ctrlKey &&
        event.altKey === options.altKey &&
        event.shiftKey === options.shiftKey
      ) {
        event.preventDefault();
        callback();
      }
    };

    const globalWindow = (globalThis as any).window;
    globalWindow?.addEventListener('keydown', handleKeyDown);

    return () => {
      globalWindow?.removeEventListener('keydown', handleKeyDown);
    };
  }, [key, callback, options.ctrlKey, options.altKey, options.shiftKey]);
};
