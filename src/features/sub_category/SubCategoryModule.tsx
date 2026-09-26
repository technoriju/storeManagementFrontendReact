import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SubCategoryListScreen } from './screens/SubCategoryListScreen';

export const SubCategoryModule = () => {
  return (
    <View style={styles.container}>
      <SubCategoryListScreen />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});


