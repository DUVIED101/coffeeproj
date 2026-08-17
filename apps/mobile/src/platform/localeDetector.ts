import { NativeModules, Platform } from 'react-native';
import type { LocaleDetector } from '@bystrobarista/core/platform/localeDetector';

export const nativeLocaleDetector: LocaleDetector = {
  detect() {
    try {
      if (Platform.OS === 'ios') {
        const settings = NativeModules.SettingsManager?.settings;
        const locale: string | undefined =
          settings?.AppleLocale || settings?.AppleLanguages?.[0];
        if (!locale) return null;
        return locale.slice(0, 2).toLowerCase();
      }
      const androidLocale: string | undefined = NativeModules.I18nManager?.localeIdentifier;
      if (!androidLocale) return null;
      return androidLocale.slice(0, 2).toLowerCase();
    } catch {
      return null;
    }
  },
};
