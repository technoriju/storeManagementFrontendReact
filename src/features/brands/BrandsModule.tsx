import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BrandListScreen } from './screens/BrandListScreen';

export const BrandsModule = () => {
  return (
    <View style={styles.container}>
      <BrandListScreen />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});
