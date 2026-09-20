import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { PosOrdersScreen } from './screens/PosOrdersScreen';
import { InvoicesScreen } from './screens/InvoicesScreen';
import { SalesReturnScreen } from './screens/SalesReturnScreen';
import { QuotationScreen } from './screens/QuotationScreen';

export type PosScreenType = 'orders' | 'invoices' | 'sales-return' | 'quotation';

interface Props {
  initialScreen?: string;
}

export const POSModule: React.FC<Props> = ({ initialScreen }) => {
  const [currentScreen, setCurrentScreen] = useState<PosScreenType>('orders');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialScreen === 'pos') setCurrentScreen('orders');
    else if (initialScreen === 'invoices') setCurrentScreen('invoices');
    else if (initialScreen === 'sales-return') setCurrentScreen('sales-return');
    else if (initialScreen === 'quotation') setCurrentScreen('quotation');
  }, [initialScreen]);

  const navigateTo = (screen: PosScreenType, id?: string) => {
    setSelectedId(id || null);
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'orders': return <PosOrdersScreen onNavigate={navigateTo} />;
      case 'invoices': return <InvoicesScreen onNavigate={navigateTo} />;
      case 'sales-return': return <SalesReturnScreen onNavigate={navigateTo} />;
      case 'quotation': return <QuotationScreen onNavigate={navigateTo} />;
      default: return <PosOrdersScreen onNavigate={navigateTo} />;
    }
  };

  return <View style={styles.container}>{renderScreen()}</View>;
};

const styles = StyleSheet.create({ container: { flex: 1 } });

