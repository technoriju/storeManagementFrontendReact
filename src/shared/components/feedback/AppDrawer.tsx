import React from 'react';
import { View, StyleSheet, Text, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/theme';

export const AppDrawer = ({ visible, title, children, onClose }: any) => {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.drawer, { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.borderRadius.lg, borderTopRightRadius: theme.borderRadius.lg }]}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.text, fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold as any }}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.colors.textSecondary }}>?</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: theme.spacing.lg, flex: 1 }}>{children}</View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  drawer: { height: '80%', width: '100%' },
  header: { padding: 16, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});
