import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

export const PurchaseDetailsScreen = ({ onNavigate, entityId }: any) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PurchaseDetailsScreen</Text>
      <Text style={styles.text}>Unit Conversion Example: 10 BOX</Text>
      <Text style={styles.text}>Conversion: 1 BOX = 24 PCS</Text>
      <Text style={styles.text}>Total: 240 PCS</Text>
      <Button title="Back" onPress={() => onNavigate('list')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  text: { fontSize: 16, marginBottom: 10 }
});
