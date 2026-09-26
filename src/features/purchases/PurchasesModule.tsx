import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { PurchaseListScreen } from './screens/PurchaseListScreen';
import { PurchaseDetailsScreen } from './screens/PurchaseDetailsScreen';
import { PurchaseFormScreen } from './screens/PurchaseFormScreen';
import { PurchaseReturnScreen } from './screens/PurchaseReturnScreen';
import { SuppliersScreen } from './screens/SuppliersScreen';
import { PaymentsScreen } from './screens/PaymentsScreen';
import { PurchaseOrderScreen } from './screens/PurchaseOrderScreen';

export type PurchaseScreenType = 'list' | 'details' | 'form' | 'return' | 'suppliers' | 'payments' | 'orders';

interface Props {
  initialScreen?: string;
}

export const PurchasesModule: React.FC<Props> = ({ initialScreen }) => {
  const [currentScreen, setCurrentScreen] = useState<PurchaseScreenType>('list');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  React.useEffect(() => {
    if (initialScreen === 'purchases') setCurrentScreen('list');
    else if (initialScreen === 'purchase_order') setCurrentScreen('orders');
    else if (initialScreen === 'purchase_return') setCurrentScreen('return');
  }, [initialScreen]);

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
      case 'orders': return <PurchaseOrderScreen onNavigate={navigateTo} />;
      default: return <PurchaseListScreen onNavigate={navigateTo} />;
    }
  };

  return <View style={styles.container}>{renderScreen()}</View>;
};

const styles = StyleSheet.create({ container: { flex: 1 } });


