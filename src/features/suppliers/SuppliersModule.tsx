import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SupplierListScreen } from './screens/SupplierListScreen';
import { SupplierDetailsScreen } from './screens/SupplierDetailsScreen';
import { SupplierFormScreen } from './components/SupplierFormScreen';
import { PaymentHistoryScreen } from '../customers/screens/PaymentHistoryScreen';
import { PaymentFormScreen } from '../customers/screens/PaymentFormScreen';

export type SupplierScreenType = 'list' | 'details' | 'form' | 'payment_history' | 'payment_form';

interface Props {
  initialScreen?: string;
}

export const SuppliersModule: React.FC<Props> = ({ initialScreen }) => {
  const [currentScreen, setCurrentScreen] = useState<SupplierScreenType>(
    initialScreen === 'supplier_payment' || initialScreen === 'supplier_payments'
      ? 'payment_history'
      : 'list'
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [paymentOptions, setPaymentOptions] = useState<{ entityType?: 'customer' | 'supplier'; paymentType?: 'receive' | 'pay' }>({
    entityType: 'supplier',
    paymentType: 'pay',
  });

  React.useEffect(() => {
    if (initialScreen === 'supplier_payment' || initialScreen === 'supplier_payments') {
      setCurrentScreen('payment_history');
      setSelectedId(null);
    } else if (initialScreen === 'suppliers') {
      setCurrentScreen('list');
      setSelectedId(null);
    }
  }, [initialScreen]);

  const navigateTo = (screen: SupplierScreenType, id?: string | number, options?: any) => {
    setSelectedId(id !== undefined && id !== null ? Number(id) : null);
    if (options) {
      setPaymentOptions(options);
    }
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'list': 
      case 'form':
        return <SupplierListScreen onNavigate={navigateTo} />;
      case 'details': return <SupplierDetailsScreen supplierId={selectedId!} onNavigate={navigateTo} />;
      case 'payment_history': return <PaymentHistoryScreen entityId={selectedId} entityType='supplier' onNavigate={navigateTo} />;
      case 'payment_form': return <PaymentFormScreen entityId={selectedId} entityType={paymentOptions.entityType || 'supplier'} initialPaymentType={paymentOptions.paymentType || 'pay'} onNavigate={navigateTo} />;
      default: return <SupplierListScreen onNavigate={navigateTo} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
      {currentScreen === 'form' && (
        <SupplierFormScreen key={selectedId ?? 'new'} supplierId={selectedId} onNavigate={navigateTo} />
      )}
    </View>
  );
};
const styles = StyleSheet.create({ container: { flex: 1 } });


