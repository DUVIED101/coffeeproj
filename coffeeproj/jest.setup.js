// Jest setup file
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// `@env` is provided by react-native-dotenv (babel-time only) and is invisible
// to Jest's resolver. Mock with stable, non-secret values so spec files don't
// need their own per-file mocks.
jest.mock(
  '@env',
  () => ({
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    NODE_ENV: 'test',
    GOOGLE_IOS_CLIENT_ID: undefined,
    YANDEX_CLIENT_ID: undefined,
    YANDEX_GEOCODER_API_KEY: 'test-yandex-geocoder-key',
  }),
  { virtual: true }
);
