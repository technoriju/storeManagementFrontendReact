import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SupplierListScreen } from './screens/SupplierListScreen';
import { SupplierDetailsScreen } from './screens/SupplierDetailsScreen';
import { SupplierFormScreen } from './screens/SupplierFormScreen';
import { PaymentHistoryScreen } from '../customers/screens/PaymentHistoryScreen';
import { PaymentFormScreen } from '../customers/screens/PaymentFormScreen';

export type SupplierScreenType = 'list' | 'details' | 'form' | 'payment_history' | 'payment_form';

export const SuppliersModule = () => {
  const [currentScreen, setCurrentScreen] = useState<SupplierScreenType>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const navigateTo = (screen: SupplierScreenType, id?: string) => {
    if (id !== undefined) setSelectedId(id);
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'list': return <SupplierListScreen onNavigate={navigateTo} />;
      case 'details': return <SupplierDetailsScreen supplierId={selectedId!} onNavigate={navigateTo} />;
      case 'form': return <SupplierFormScreen supplierId={selectedId} onNavigate={navigateTo} />;
      case 'payment_history': return <PaymentHistoryScreen entityId={selectedId!} entityType='supplier' onNavigate={navigateTo} />;
      case 'payment_form': return <PaymentFormScreen entityId={selectedId!} entityType='supplier' onNavigate={navigateTo} />;
      default: return <SupplierListScreen onNavigate={navigateTo} />;
    }
  };

  return <View style={styles.container}>{renderScreen()}</View>;
};
const styles = StyleSheet.create({ container: { flex: 1 } });
