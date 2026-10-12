import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { useTheme } from '../theme/theme';
import { Icon } from './Icon';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstallBanner = () => {
  const theme = useTheme();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOSPrompt, setIsIOSPrompt] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    // Check if already running as installed standalone PWA
    const isStandalone =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    // Check if previously dismissed in this session
    try {
      if (sessionStorage.getItem('pwa_install_dismissed') === 'true') {
        return;
      }
    } catch (_) {}

    // Android / Chromium beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const handleAppInstalled = () => {
      setVisible(false);
      setPromptEvent(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // iOS detection (Safari doesn't support beforeinstallprompt)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|android/.test(ua);

    if (isIOS && isSafari) {
      const timer = setTimeout(() => {
        setIsIOSPrompt(true);
        setVisible(true);
      }, 2500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setVisible(false);
      }
      setPromptEvent(null);
    } catch (_) {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem('pwa_install_dismissed', 'true');
    } catch (_) {}
  };

  if (!visible) return null;

  return (
    <View
      style={[
        styles.bannerContainer,
        {
          backgroundColor: theme.isDark ? '#1e293b' : '#ffffff',
          borderColor: theme.isDark ? '#334155' : '#e2e8f0',
        },
      ]}
    >
      <View style={styles.contentRow}>
        <Image
          source={{ uri: '/pwa-192x192.png' }}
          style={styles.appIcon}
          resizeMode="cover"
        />

        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {isIOSPrompt ? 'Install on iPhone / iPad' : 'Install App'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {isIOSPrompt
              ? "Tap Share [↑] then 'Add to Home Screen' [+]"
              : 'Add to home screen for fast fullscreen access'}
          </Text>
        </View>

        <View style={styles.actions}>
          {!isIOSPrompt && (
            <TouchableOpacity
              style={[styles.installButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleInstallClick}
              activeOpacity={0.8}
            >
              <Text style={styles.installButtonText}>Install</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close"
          >
            <Icon name="x" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute' as any,
    bottom: 12,
    left: 12,
    right: 12,
    zIndex: 999999,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  installButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  installButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
