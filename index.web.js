import { AppRegistry } from 'react-native';
import { App } from './src/app/App';
import { name as appName } from './app.json';

// Note: We bypass the SQLite initialization here because op-sqlite
// is not compatible with the web environment.

AppRegistry.registerComponent(appName, () => App);
AppRegistry.runApplication(appName, {
  initialProps: {},
  rootTag: document.getElementById('root'),
});
