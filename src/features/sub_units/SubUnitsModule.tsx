import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SubUnitListScreen } from './screens/SubUnitListScreen';

export const SubUnitsModule = () => {
  return (
    <View style={styles.container}>
      <SubUnitListScreen />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});


