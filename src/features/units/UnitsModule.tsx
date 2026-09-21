import React from 'react';
import { View, StyleSheet } from 'react-native';
import { UnitListScreen } from './screens/UnitListScreen';

export const UnitsModule = () => {
  return (
    <View style={styles.container}>
      <UnitListScreen />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});
