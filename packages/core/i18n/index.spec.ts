import { describe, it, expect, jest } from '@jest/globals';
import type { Platform } from '../platform';

const platformWithLanguage = (stored: string | null): Platform =>
  ({
    storage: {
      getItem: async () => stored,
      setItem: async () => undefined,
      removeItem: async () => undefined,
    },
    localeDetector: { detect: () => null },
  }) as unknown as Platform;

// i18next is a module-level singleton, so every case gets a fresh module graph
// (the platform registry included — it must be set on the fresh instance).
async function loadI18n(stored: string | null) {
  jest.resetModules();
  const platform = await import('../platform');
  platform.setPlatform(platformWithLanguage(stored));
  const mod = await import('./index');
  await mod.initI18n();
  return mod;
}

describe('initI18n', () => {
  it('parses only the Russian bundle when Russian is the stored language', async () => {
    const mod = await loadI18n('ru');
    expect([
      mod.default.hasResourceBundle('ru', 'translation'),
      mod.default.hasResourceBundle('en', 'translation'),
    ]).toEqual([true, false]);
  });

  it('parses the English bundle alongside the Russian fallback for English users', async () => {
    const mod = await loadI18n('en');
    expect([
      mod.default.hasResourceBundle('ru', 'translation'),
      mod.default.hasResourceBundle('en', 'translation'),
      mod.getCurrentLanguage(),
    ]).toEqual([true, true, 'en']);
  });
});

describe('changeLanguage', () => {
  it('loads the English bundle on demand and translates with it', async () => {
    const mod = await loadI18n('ru');
    await mod.changeLanguage('en');
    expect([
      mod.default.hasResourceBundle('en', 'translation'),
      mod.getCurrentLanguage(),
      mod.default.t('common.cancel'),
    ]).toEqual([true, 'en', 'Cancel']);
  });
});
