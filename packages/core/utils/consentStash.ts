import { getPlatform } from '../platform';

// Carries the "user already ticked the consent checkboxes on the signup flow"
// flag from the auth screens (which run BEFORE auth.signUp / OAuth) to
// ProfileBootstrap (which runs AFTER the session lands and is where we touch
// public.users). Stash → consume → write consent_accepted_at = NOW().
//
// Why not put it in auth.users metadata: the email/password flow can't write
// metadata until after signUp returns, and the OAuth flow's metadata is
// provider-controlled. Platform storage is the only shared channel between
// the signup-button tap and the post-auth bootstrap.
const KEY = 'auth.consentAcceptedAtSignup';

export const stashConsentAccepted = async (): Promise<void> => {
  try {
    await getPlatform().storage.setItem(KEY, '1');
  } catch (error) {
    console.warn('[consentStash] failed to stash:', error);
  }
};

export const consumeStashedConsent = async (): Promise<boolean> => {
  try {
    const storage = getPlatform().storage;
    const value = await storage.getItem(KEY);
    if (value === '1') {
      await storage.removeItem(KEY);
      return true;
    }
  } catch (error) {
    console.warn('[consentStash] failed to read:', error);
  }
  return false;
};

export const clearStashedConsent = async (): Promise<void> => {
  try {
    await getPlatform().storage.removeItem(KEY);
  } catch {
    // best-effort
  }
};
