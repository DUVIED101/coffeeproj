import type { Session } from '@supabase/supabase-js';

// Yandex isn't a native Supabase provider; we sign Yandex users in via a
// magic-link exchange, which makes Supabase auto-create an `email` identity
// for them. user_metadata.provider is the only authoritative marker that the
// account was created through the Yandex flow (set by yandex-oauth-exchange
// at admin.createUser time) and that no real password was ever set.
export const isYandexUser = (session: Session | null): boolean =>
  session?.user?.user_metadata?.provider === 'yandex';

export const hasPasswordAuth = (session: Session | null): boolean => {
  if (session === null || session === undefined) return false;
  if (isYandexUser(session)) return false;
  const identities = session.user?.identities;
  if (identities && identities.length > 0) {
    return identities.some(identity => identity.provider === 'email');
  }
  return session.user?.app_metadata?.provider === 'email';
};

export const isAppleOnlyUser = (session: Session | null): boolean => {
  if (session === null || session === undefined) return false;
  if (hasPasswordAuth(session)) return false;
  const identities = session.user?.identities ?? [];
  if (identities.length === 0) {
    return session.user?.app_metadata?.provider === 'apple';
  }
  const providers = new Set(identities.map(i => i.provider));
  return providers.size === 1 && providers.has('apple');
};
