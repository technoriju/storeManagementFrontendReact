import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ManageStockScreen } from './screens/ManageStockScreen';
import { StockDashboardScreen } from './screens/StockDashboardScreen';
import { StockAdjustmentScreen } from './screens/StockAdjustmentScreen';
import { StockTransferScreen } from './screens/StockTransferScreen';
import { LowStockScreen } from './screens/LowStockScreen';
import { StockMovementScreen } from './screens/StockMovementScreen';

export type InventoryScreenType =
  | 'manage_stock'
  | 'dashboard'
  | 'list'
  | 'adjustment'
  | 'stock_adjustment'
  | 'transfer'
  | 'stock_transfer'
  | 'low_stock'
  | 'low_stocks'
  | 'movement';

interface Props {
  initialScreen?: string;
}

export const InventoryModule: React.FC<Props> = ({ initialScreen = 'manage_stock' }) => {
  const getResolvedScreen = (scr?: string): InventoryScreenType => {
    if (!scr) return 'manage_stock';
    if (scr === 'manage_stock' || scr === 'inventory' || scr === 'list') return 'manage_stock';
    if (scr === 'stock_adjustment' || scr === 'adjustment') return 'adjustment';
    if (scr === 'stock_transfer' || scr === 'transfer') return 'transfer';
    if (scr === 'low_stocks' || scr === 'low_stock') return 'low_stock';
    if (scr === 'dashboard') return 'dashboard';
    if (scr === 'movement') return 'movement';
    return 'manage_stock';
  };

  const [currentScreen, setCurrentScreen] = useState<InventoryScreenType>(() =>
    getResolvedScreen(initialScreen),
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (initialScreen) {
      setCurrentScreen(getResolvedScreen(initialScreen));
    }
  }, [initialScreen]);

  const navigateTo = (screen: InventoryScreenType, id?: string | number) => {
    setSelectedId(id ? Number(id) : null);
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'manage_stock':
      case 'list':
        return <ManageStockScreen onNavigate={navigateTo} />;
      case 'dashboard':
        return <StockDashboardScreen onNavigate={navigateTo} />;
      case 'adjustment':
      case 'stock_adjustment':
        // ManageStockScreen has embedded adjustment modal + capability
        return <ManageStockScreen onNavigate={navigateTo} />;
      case 'transfer':
      case 'stock_transfer':
        return <StockTransferScreen onNavigate={navigateTo} />;
      case 'low_stock':
      case 'low_stocks':
        return <ManageStockScreen onNavigate={navigateTo} />;
      case 'movement':
        return <StockMovementScreen onNavigate={navigateTo} />;
      default:
        return <ManageStockScreen onNavigate={navigateTo} />;
    }
  };

  return <View style={styles.container}>{renderScreen()}</View>;
};

const styles = StyleSheet.create({ container: { flex: 1 } });
