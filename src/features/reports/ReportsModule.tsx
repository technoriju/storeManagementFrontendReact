import React from 'react';
import { ReportsScreen } from './screens/ReportsScreen';

interface ReportsModuleProps {
  initialReport?: string;
  onNavigateReport?: (reportId: string) => void;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  initialReport,
  onNavigateReport,
}) => {
  return (
    <ReportsScreen
      initialReport={initialReport}
      onNavigateReport={onNavigateReport}
    />
  );
};


