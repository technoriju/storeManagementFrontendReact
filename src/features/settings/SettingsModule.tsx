import React from 'react';
import { SettingsLayout } from './screens/SettingsLayout';

interface SettingsModuleProps {
  initialRoute?: string;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({ initialRoute }) => {
  return <SettingsLayout initialRoute={initialRoute} />;
};



