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

interface ProductsModuleProps {
  initialScreen?: string;
  onNavigateTab?: (tab: string) => void;
}

export const ProductsModule: React.FC<ProductsModuleProps> = ({
  initialScreen = 'list',
  onNavigateTab,
}) => {
  const getResolvedScreen = (scr?: string): ProductScreenType => {
    if (scr === 'add_product' || scr === 'create_product' || scr === 'form') {
      return 'form';
    }
    return 'list';
  };

  const [currentScreen, setCurrentScreen] = useState<ProductScreenType>(() => getResolvedScreen(initialScreen));
  const [selectedProductId, setSelectedProductId] = useState<number | string | null>(null);

  React.useEffect(() => {
    if (initialScreen === 'add_product' || initialScreen === 'create_product' || initialScreen === 'form') {
      setSelectedProductId(null);
      setCurrentScreen('form');
    } else if (initialScreen === 'products' || initialScreen === 'list') {
      setSelectedProductId(null);
      setCurrentScreen('list');
    }
  }, [initialScreen]);

  const navigateTo = (screen: ProductScreenType, productId?: string | number) => {
    setSelectedProductId(productId !== undefined && productId !== null ? productId : null);
    setCurrentScreen(screen);
    if (screen === 'list' && onNavigateTab) {
      onNavigateTab('products');
    } else if (screen === 'form' && (productId === undefined || productId === null) && onNavigateTab) {
      onNavigateTab('add_product');
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'list':
        return <ProductListScreen onNavigate={navigateTo} />;
      case 'details':
        return <ProductDetailsScreen productId={selectedProductId!} onNavigate={navigateTo} />;
      case 'form':
        return (
          <ProductFormScreen 
            key={selectedProductId ? String(selectedProductId) : 'new'} 
            productId={selectedProductId} 
            onNavigate={navigateTo} 
          />
        );
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


