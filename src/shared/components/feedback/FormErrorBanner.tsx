import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';

interface FormErrorBannerProps {
  message?: string | null;
  style?: any;
}

export const FormErrorBanner: React.FC<FormErrorBannerProps> = ({ message, style }) => {
  if (!message) return null;

  return (
    <View style={[styles.container, style]}>
      <AlertCircle size={16} color="#DC2626" style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  icon: {
    marginRight: 8,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});
