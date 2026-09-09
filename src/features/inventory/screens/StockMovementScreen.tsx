import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

export const StockMovementScreen = ({ onNavigate, entityId }: any) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>StockMovementScreen</Text>
      
      <Button title="Back" onPress={() => onNavigate('list')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  text: { fontSize: 16, marginBottom: 10 }
});
