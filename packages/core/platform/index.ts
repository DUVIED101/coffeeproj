import type { AlertAdapter } from './alert';
import type { AppStateAdapter } from './appState';
import type { GeolocationAdapter } from './geolocation';
import type { LocaleDetector } from './localeDetector';
import type { PhotoPickerAdapter } from './photoPicker';
import type { PushAdapter } from './push';
import type { StorageAdapter } from './storage';

export type Platform = {
  storage: StorageAdapter;
  push: PushAdapter;
  geolocation: GeolocationAdapter;
  photoPicker: PhotoPickerAdapter;
  localeDetector: LocaleDetector;
  appState: AppStateAdapter;
  alert: AlertAdapter;
  // Free-form tag ("ios/17.4", "web/chrome") appended to user-agents,
  // legal-acceptance rows, and Sentry breadcrumbs.
  userAgentTag: string;
  // Semver-ish string ("1.0.1"). Persisted per-row into audit tables
  // (legal_acceptances.app_version, ...) so we can tell which client shipped
  // the write. Different value per app (mobile vs web).
  appVersion: string;
};

let _platform: Platform | null = null;

export const setPlatform = (platform: Platform): void => {
  _platform = platform;
};

export const getPlatform = (): Platform => {
  if (!_platform) {
    throw new Error(
      'Platform not initialized. Call setPlatform() before touching core services.'
    );
  }
  return _platform;
};

// Test-only reset. Never call in production; kept exported for jest.
export const _resetPlatformForTests = (): void => {
  _platform = null;
};

export type { AlertAdapter, AlertButton } from './alert';
export type { AppStateAdapter, AppStatus } from './appState';
export type { GeolocationAdapter } from './geolocation';
export type { LocaleDetector } from './localeDetector';
export type {
  PhotoPickerAdapter,
  PickedAsset,
  PhotoRejection,
  PickResult,
  PickPhotosOptions,
} from './photoPicker';
export type { PushAdapter, PushPermission, PushSubscription } from './push';
export type { StorageAdapter } from './storage';
