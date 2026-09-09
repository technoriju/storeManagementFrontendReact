import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { PurchaseListScreen } from './screens/PurchaseListScreen';
import { PurchaseDetailsScreen } from './screens/PurchaseDetailsScreen';
import { PurchaseFormScreen } from './screens/PurchaseFormScreen';
import { PurchaseReturnScreen } from './screens/PurchaseReturnScreen';
import { SuppliersScreen } from './screens/SuppliersScreen';
import { PaymentsScreen } from './screens/PaymentsScreen';

export type PurchaseScreenType = 'list' | 'details' | 'form' | 'return' | 'suppliers' | 'payments';

export const PurchasesModule = () => {
  const [currentScreen, setCurrentScreen] = useState<PurchaseScreenType>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const navigateTo = (screen: PurchaseScreenType, id?: string) => {
    setSelectedId(id || null);
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'list': return <PurchaseListScreen onNavigate={navigateTo} />;
      case 'details': return <PurchaseDetailsScreen onNavigate={navigateTo} entityId={selectedId} />;
      case 'form': return <PurchaseFormScreen onNavigate={navigateTo} entityId={selectedId} />;
      case 'return': return <PurchaseReturnScreen onNavigate={navigateTo} />;
      case 'suppliers': return <SuppliersScreen onNavigate={navigateTo} />;
      case 'payments': return <PaymentsScreen onNavigate={navigateTo} />;
      default: return <PurchaseListScreen onNavigate={navigateTo} />;
    }
  };

  return <View style={styles.container}>{renderScreen()}</View>;
};

const styles = StyleSheet.create({ container: { flex: 1 } });
