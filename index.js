/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { App } from './src/app/App';
import { name as appName } from './app.json';
import { initializeDatabase } from './src/core/database/db';

// Initialize SQLite Database
initializeDatabase();

AppRegistry.registerComponent(appName, () => App);
