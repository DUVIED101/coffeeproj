// Jest setup file
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Wire the core platform registry to the mocked AsyncStorage so core-side
// code (readCachedSession, migrateSessionKey, consent/socialAuth stashes,
// pending queues) works in mobile jest without touching real native modules.
// Non-storage adapters are minimal stubs; specs that exercise push /
// geolocation / photoPicker / etc. must mock the caller directly.
const asyncStorageMod = require('@react-native-async-storage/async-storage');
// Mock uses `module.exports = asMock` (no .default); real ESM build sets .default.
const AsyncStorage = asyncStorageMod.default ?? asyncStorageMod;
const { setPlatform } = require('@bystrobarista/core/platform');
setPlatform({
  storage: {
    getItem: key => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: key => AsyncStorage.removeItem(key),
  },
  push: {
    requestPermission: async () => false,
    checkPermission: async () => 'default',
    subscribe: async () => {
      throw new Error('push.subscribe not implemented in jest');
    },
    unsubscribe: async () => undefined,
    onNotification: () => () => undefined,
    getInitialNotification: async () => null,
    clearAllDelivered: () => undefined,
  },
  geolocation: {
    requestPermission: async () => false,
    getCurrentPosition: async () => null,
  },
  photoPicker: {
    pick: async () => null,
    readAsArrayBuffer: async () => new ArrayBuffer(0),
  },
  localeDetector: { detect: () => null },
  appState: {
    getCurrentState: () => 'active',
    addListener: () => () => undefined,
  },
  alert: { show: () => undefined },
  userAgentTag: 'jest/0.0.0',
  appVersion: '0.0.0',
});

// `@env` is provided by react-native-dotenv (babel-time only) and is invisible
// to Jest's resolver. Mock with stable, non-secret values so spec files don't
// need their own per-file mocks.
jest.mock(
  '@env',
  () => ({
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_PROXY_URL: 'https://api.test-proxy.example',
    NODE_ENV: 'test',
    GOOGLE_IOS_CLIENT_ID: undefined,
    YANDEX_CLIENT_ID: undefined,
    YANDEX_GEOCODER_API_KEY: 'test-yandex-geocoder-key',
  }),
  { virtual: true }
);
