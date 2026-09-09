import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getPlatform } from '../platform';

const LANG_STORAGE_KEY = 'app.language';

export type SupportedLanguage = 'ru' | 'en';
const SUPPORTED_LANGUAGES: ReadonlyArray<SupportedLanguage> = ['ru', 'en'];

function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

async function resolveInitialLanguage(): Promise<SupportedLanguage> {
  try {
    const stored = await getPlatform().storage.getItem(LANG_STORAGE_KEY);
    if (stored && isSupportedLanguage(stored)) return stored;
  } catch {
    // ignore storage failures
  }
  const device = getPlatform().localeDetector.detect();
  if (device && isSupportedLanguage(device)) return device;
  return 'ru';
}

// Russian is the fallback, so it is always parsed; the other bundle (~75 KB
// of JSON) is only parsed when someone actually switches to it.
const loadBundle = (lang: SupportedLanguage): Record<string, unknown> =>
  lang === 'en' ? require('./en.json') : require('./ru.json');

function ensureBundle(lang: SupportedLanguage): void {
  if (!i18n.hasResourceBundle(lang, 'translation')) {
    i18n.addResourceBundle(lang, 'translation', loadBundle(lang));
  }
}

export async function initI18n(): Promise<void> {
  if (i18n.isInitialized) return;
  const lng = await resolveInitialLanguage();
  const resources: Record<string, { translation: Record<string, unknown> }> = {
    ru: { translation: loadBundle('ru') },
  };
  if (lng !== 'ru') resources[lng] = { translation: loadBundle(lng) };
  await i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    resources,
    lng,
    fallbackLng: 'ru',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
  ensureBundle(lang);
  await i18n.changeLanguage(lang);
  try {
    await getPlatform().storage.setItem(LANG_STORAGE_KEY, lang);
  } catch (err) {
    console.warn('Failed to persist language preference:', err);
  }
}

export function getCurrentLanguage(): SupportedLanguage {
  const current = i18n.language?.slice(0, 2).toLowerCase() ?? 'ru';
  return isSupportedLanguage(current) ? current : 'ru';
}

export default i18n;
