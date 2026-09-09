import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StockDashboardScreen } from './screens/StockDashboardScreen';
import { StockListScreen } from './screens/StockListScreen';
import { StockLedgerScreen } from './screens/StockLedgerScreen';
import { StockAdjustmentScreen } from './screens/StockAdjustmentScreen';
import { StockTransferScreen } from './screens/StockTransferScreen';
import { LowStockScreen } from './screens/LowStockScreen';
import { StockMovementScreen } from './screens/StockMovementScreen';

export type InventoryScreenType = 'dashboard' | 'list' | 'ledger' | 'adjustment' | 'transfer' | 'low_stock' | 'movement';

export const InventoryModule = () => {
  const [currentScreen, setCurrentScreen] = useState<InventoryScreenType>('dashboard');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const navigateTo = (screen: InventoryScreenType, id?: string) => {
    setSelectedId(id || null);
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard': return <StockDashboardScreen onNavigate={navigateTo} />;
      case 'list': return <StockListScreen onNavigate={navigateTo} />;
      case 'ledger': return <StockLedgerScreen onNavigate={navigateTo} />;
      case 'adjustment': return <StockAdjustmentScreen onNavigate={navigateTo} />;
      case 'transfer': return <StockTransferScreen onNavigate={navigateTo} />;
      case 'low_stock': return <LowStockScreen onNavigate={navigateTo} />;
      case 'movement': return <StockMovementScreen onNavigate={navigateTo} />;
      default: return <StockDashboardScreen onNavigate={navigateTo} />;
    }
  };

  return <View style={styles.container}>{renderScreen()}</View>;
};

const styles = StyleSheet.create({ container: { flex: 1 } });
