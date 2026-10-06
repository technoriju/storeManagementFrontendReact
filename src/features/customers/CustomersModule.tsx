import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { CustomerListScreen } from './screens/CustomerListScreen';
import { CustomerDetailsScreen } from './screens/CustomerDetailsScreen';
import { CustomerFormScreen } from './components/CustomerFormScreen';
import { PaymentHistoryScreen } from './screens/PaymentHistoryScreen';
import { PaymentFormScreen } from './screens/PaymentFormScreen';

export type CustomerScreenType = 'list' | 'details' | 'form' | 'payment_history' | 'payment_form';

interface Props {
  initialScreen?: string;
}

export const CustomersModule: React.FC<Props> = ({ initialScreen }) => {
  const [currentScreen, setCurrentScreen] = useState<CustomerScreenType>(
    initialScreen === 'customer_payment' || initialScreen === 'customer_payments'
      ? 'payment_history'
      : 'list'
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (initialScreen === 'customer_payment' || initialScreen === 'customer_payments') {
      setCurrentScreen('payment_history');
      setSelectedId(null);
    } else if (initialScreen === 'customers') {
      setCurrentScreen('list');
      setSelectedId(null);
    }
  }, [initialScreen]);

  const [paymentOptions, setPaymentOptions] = useState<{ entityType?: 'customer' | 'supplier'; paymentType?: 'receive' | 'pay' }>({});

  const navigateTo = (screen: CustomerScreenType, id?: string | number, options?: any) => {
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
        return <CustomerListScreen onNavigate={navigateTo} />;
      case 'details': return <CustomerDetailsScreen customerId={selectedId!} onNavigate={navigateTo} />;
      case 'payment_history': return <PaymentHistoryScreen entityId={selectedId} entityType='customer' onNavigate={navigateTo} />;
      case 'payment_form': 
        return (
          <PaymentFormScreen 
            entityId={selectedId} 
            entityType={paymentOptions.entityType || 'customer'} 
            initialPaymentType={paymentOptions.paymentType} 
            onNavigate={navigateTo} 
          />
        );
      default: return <CustomerListScreen onNavigate={navigateTo} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
      {currentScreen === 'form' && (
        <CustomerFormScreen key={selectedId ?? 'new'} customerId={selectedId} onNavigate={navigateTo} />
      )}
    </View>
  );
};
const styles = StyleSheet.create({ container: { flex: 1 } });


