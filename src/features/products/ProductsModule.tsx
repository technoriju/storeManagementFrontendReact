import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ProductListScreen } from './screens/ProductListScreen';
import { ProductDetailsScreen } from './screens/ProductDetailsScreen';
import { ProductFormScreen } from './screens/ProductFormScreen';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { BrandsScreen } from './screens/BrandsScreen';
import { UnitsScreen } from './screens/UnitsScreen';
import { ProductImportScreen } from './screens/ProductImportScreen';

export type ProductScreenType = 
  | 'list' 
  | 'details' 
  | 'form' 
  | 'categories' 
  | 'brands' 
  | 'units' 
  | 'import';

export const ProductsModule = () => {
  const [currentScreen, setCurrentScreen] = useState<ProductScreenType>('list');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const navigateTo = (screen: ProductScreenType, productId?: string) => {
    setSelectedProductId(productId || null);
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'list':
        return <ProductListScreen onNavigate={navigateTo} />;
      case 'details':
        return <ProductDetailsScreen productId={selectedProductId!} onNavigate={navigateTo} />;
      case 'form':
        return <ProductFormScreen productId={selectedProductId} onNavigate={navigateTo} />;
      case 'categories':
        return <CategoriesScreen onNavigate={navigateTo} />;
      case 'brands':
        return <BrandsScreen onNavigate={navigateTo} />;
      case 'units':
        return <UnitsScreen onNavigate={navigateTo} />;
      case 'import':
        return <ProductImportScreen onNavigate={navigateTo} />;
      default:
        return <ProductListScreen onNavigate={navigateTo} />;
    }
  };

  return <View style={styles.container}>{renderScreen()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
