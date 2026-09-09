import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

export const StockLedgerScreen = ({ onNavigate, entityId }: any) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>StockLedgerScreen</Text>
      <Text style={styles.text}>Stock: 240 PCS</Text>
      <Text style={styles.text}>(Equivalent to 10 BOX, 1 BOX = 24 PCS)</Text>
      <Button title="Back" onPress={() => onNavigate('list')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  text: { fontSize: 16, marginBottom: 10 }
});
