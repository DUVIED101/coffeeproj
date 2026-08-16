import 'intl-pluralrules';
import 'react-native-url-polyfill/auto';
import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './package.json';

AppRegistry.registerComponent(appName, () => App);
