import React from 'react';
import { DashboardScreen } from './screens/DashboardScreen';

interface DashboardModuleProps {
  onNavigateTab?: (tab: string) => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({ onNavigateTab }) => {
  return <DashboardScreen onNavigateTab={onNavigateTab} />;
};
