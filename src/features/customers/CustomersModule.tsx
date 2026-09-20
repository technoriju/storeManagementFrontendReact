import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { CustomerListScreen } from './screens/CustomerListScreen';
import { CustomerDetailsScreen } from './screens/CustomerDetailsScreen';
import { CustomerFormScreen } from './components/CustomerFormScreen';
import { PaymentHistoryScreen } from './screens/PaymentHistoryScreen';
import { PaymentFormScreen } from './screens/PaymentFormScreen';

export type CustomerScreenType = 'list' | 'details' | 'form' | 'payment_history' | 'payment_form';

export const CustomersModule = () => {
  const [currentScreen, setCurrentScreen] = useState<CustomerScreenType>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const navigateTo = (screen: CustomerScreenType, id?: string) => {
    if (id !== undefined) setSelectedId(id);
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'list': 
      case 'form':
        return <CustomerListScreen onNavigate={navigateTo} />;
      case 'details': return <CustomerDetailsScreen customerId={selectedId!} onNavigate={navigateTo} />;
      case 'payment_history': return <PaymentHistoryScreen entityId={selectedId!} entityType='customer' onNavigate={navigateTo} />;
      case 'payment_form': return <PaymentFormScreen entityId={selectedId!} entityType='customer' onNavigate={navigateTo} />;
      default: return <CustomerListScreen onNavigate={navigateTo} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
      {currentScreen === 'form' && (
        <CustomerFormScreen customerId={selectedId} onNavigate={navigateTo} />
      )}
    </View>
  );
};
const styles = StyleSheet.create({ container: { flex: 1 } });
