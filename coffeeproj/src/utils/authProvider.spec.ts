import { describe, it, expect } from '@jest/globals';
import type { Session } from '@supabase/supabase-js';
import { isYandexUser, hasPasswordAuth, isAppleOnlyUser } from './authProvider';

type SessionFixture = {
  identities?: Array<{ provider: string }>;
  userMetaProvider?: string;
  appMetaProvider?: string;
};

const buildSession = (fixture: SessionFixture): Session =>
  ({
    user: {
      identities: fixture.identities,
      user_metadata: fixture.userMetaProvider ? { provider: fixture.userMetaProvider } : {},
      app_metadata: fixture.appMetaProvider ? { provider: fixture.appMetaProvider } : {},
    },
  }) as unknown as Session;

describe('isYandexUser', () => {
  it('returns true when user_metadata.provider is yandex', () => {
    expect(isYandexUser(buildSession({ userMetaProvider: 'yandex' }))).toBe(true);
  });

  it('returns false for an email user', () => {
    expect(
      isYandexUser(buildSession({ identities: [{ provider: 'email' }], appMetaProvider: 'email' }))
    ).toBe(false);
  });

  it('returns false for a google user', () => {
    expect(
      isYandexUser(
        buildSession({ identities: [{ provider: 'google' }], appMetaProvider: 'google' })
      )
    ).toBe(false);
  });

  it('returns false for a null session', () => {
    expect(isYandexUser(null)).toBe(false);
  });
});

describe('hasPasswordAuth', () => {
  it('returns true when the user has an email identity and no yandex marker', () => {
    expect(hasPasswordAuth(buildSession({ identities: [{ provider: 'email' }] }))).toBe(true);
  });

  it('returns false for a yandex user even when an email identity is present', () => {
    expect(
      hasPasswordAuth(
        buildSession({ identities: [{ provider: 'email' }], userMetaProvider: 'yandex' })
      )
    ).toBe(false);
  });

  it('returns false for a google-only user', () => {
    expect(hasPasswordAuth(buildSession({ identities: [{ provider: 'google' }] }))).toBe(false);
  });

  it('returns false for an apple-only user', () => {
    expect(hasPasswordAuth(buildSession({ identities: [{ provider: 'apple' }] }))).toBe(false);
  });

  it('falls back to app_metadata.provider when identities is missing', () => {
    expect(hasPasswordAuth(buildSession({ appMetaProvider: 'email' }))).toBe(true);
  });

  it('returns false for a null session', () => {
    expect(hasPasswordAuth(null)).toBe(false);
  });
});

describe('isAppleOnlyUser', () => {
  it('returns true when the only identity is apple', () => {
    expect(isAppleOnlyUser(buildSession({ identities: [{ provider: 'apple' }] }))).toBe(true);
  });

  it('returns true when identities is empty but app_metadata.provider is apple', () => {
    expect(isAppleOnlyUser(buildSession({ identities: [], appMetaProvider: 'apple' }))).toBe(true);
  });

  it('returns false when the user also has an email identity', () => {
    expect(
      isAppleOnlyUser(buildSession({ identities: [{ provider: 'apple' }, { provider: 'email' }] }))
    ).toBe(false);
  });

  it('returns false for a yandex user', () => {
    expect(
      isAppleOnlyUser(
        buildSession({ identities: [{ provider: 'email' }], userMetaProvider: 'yandex' })
      )
    ).toBe(false);
  });

  it('returns false for a google-only user', () => {
    expect(isAppleOnlyUser(buildSession({ identities: [{ provider: 'google' }] }))).toBe(false);
  });

  it('returns false for a null session', () => {
    expect(isAppleOnlyUser(null)).toBe(false);
  });
});
