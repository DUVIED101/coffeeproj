import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { NativeModules, Platform } from 'react-native';
import en from './en.json';
import ru from './ru.json';

const LANG_STORAGE_KEY = 'app.language';

export type SupportedLanguage = 'ru' | 'en';
const SUPPORTED_LANGUAGES: ReadonlyArray<SupportedLanguage> = ['ru', 'en'];

function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

function readDeviceLocale(): SupportedLanguage | null {
  try {
    if (Platform.OS === 'ios') {
      const settings = NativeModules.SettingsManager?.settings;
      const locale: string | undefined = settings?.AppleLocale || settings?.AppleLanguages?.[0];
      if (!locale) return null;
      const prefix = locale.slice(0, 2).toLowerCase();
      return isSupportedLanguage(prefix) ? prefix : null;
    }
    const androidLocale: string | undefined = NativeModules.I18nManager?.localeIdentifier;
    if (!androidLocale) return null;
    const prefix = androidLocale.slice(0, 2).toLowerCase();
    return isSupportedLanguage(prefix) ? prefix : null;
  } catch {
    return null;
  }
}

async function resolveInitialLanguage(): Promise<SupportedLanguage> {
  try {
    const stored = await AsyncStorage.getItem(LANG_STORAGE_KEY);
    if (stored && isSupportedLanguage(stored)) return stored;
  } catch {
    // ignore storage failures
  }
  const device = readDeviceLocale();
  if (device) return device;
  return 'ru';
}

export async function initI18n(): Promise<void> {
  if (i18n.isInitialized) return;
  const lng = await resolveInitialLanguage();
  await i18n.use(initReactI18next).init({
    resources: {
      ru: { translation: ru },
      en: { translation: en },
    },
    lng,
    fallbackLng: 'ru',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch (err) {
    console.warn('Failed to persist language preference:', err);
  }
}

export function getCurrentLanguage(): SupportedLanguage {
  const current = i18n.language?.slice(0, 2).toLowerCase() ?? 'ru';
  return isSupportedLanguage(current) ? current : 'ru';
}

export default i18n;
