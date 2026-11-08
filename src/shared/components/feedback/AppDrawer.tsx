import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useTheme } from '../../theme/theme';
import { Icon } from '../Icon';

export interface AppDrawerProps {
  visible: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  position?: 'left' | 'bottom';
}

export const AppDrawer: React.FC<AppDrawerProps> = ({
  visible,
  title = 'Tarama Enterprise',
  children,
  onClose,
  position = 'left',
}) => {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        {/* Backdrop: pressing outside closes the sidebar */}
        <Pressable
          style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          onPress={onClose}
          accessibilityLabel="Close sidebar"
          accessibilityRole="button"
        />

        {/* Drawer content: pressing inside does not close */}
        <Pressable
          style={[
            styles.drawerContent,
            position === 'left' ? styles.drawerLeft : styles.drawerBottom,
            { backgroundColor: theme.colors.surface },
          ]}
          onPress={(e) => {
            e.stopPropagation?.();
          }}
        >
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text
              style={[
                styles.title,
                { color: theme.colors.text, fontSize: theme.typography.sizes.md },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Icon name="x" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.body}>{children}</View>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    position: 'relative',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  drawerContent: {
    position: 'absolute',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 16,
  },
  drawerLeft: {
    top: 0,
    bottom: 0,
    left: 0,
    width: 280,
    maxWidth: '82%',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  drawerBottom: {
    bottom: 0,
    left: 0,
    right: 0,
    height: '80%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
    height: 52,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
});
