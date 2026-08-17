import 'intl-pluralrules';
import 'react-native-url-polyfill/auto';
import { AppRegistry } from 'react-native';
import { setPlatform } from '@bystrobarista/core/platform';
import { nativePlatform } from './src/platform';
import App from './src/App';
import { name as appName } from './package.json';

// Must run before ANY core module reads getPlatform() — that includes
// modules pulled in transitively by App's import graph (services, stores,
// utils). Import order matters: setPlatform is called synchronously here,
// then App is registered.
setPlatform(nativePlatform);

AppRegistry.registerComponent(appName, () => App);
