import { Platform as RNPlatform } from 'react-native';
import type { Platform } from '@bystrobarista/core/platform';
import { APP_VERSION } from '../config/version';
import { nativeAlert } from './alert';
import { nativeAppState } from './appState';
import { nativeGeolocation } from './geolocation';
import { nativeLocaleDetector } from './localeDetector';
import { nativePhotoPicker } from './photoPicker';
import { nativePush } from './push';
import { nativeStorage } from './storage';

const buildUserAgentTag = (): string =>
  `BystroBarista/${APP_VERSION} ${RNPlatform.OS}/${RNPlatform.Version}`;

export const nativePlatform: Platform = {
  storage: nativeStorage,
  push: nativePush,
  geolocation: nativeGeolocation,
  photoPicker: nativePhotoPicker,
  localeDetector: nativeLocaleDetector,
  appState: nativeAppState,
  alert: nativeAlert,
  userAgentTag: buildUserAgentTag(),
};
