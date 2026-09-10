// Explicit cookie consent for the web version (privacy policy §10.4). The
// record carries the policy version it was given under, so a new policy
// edition asks again; the old "bb_cookie_notice_ack" flag is deliberately
// not honoured.
export const COOKIE_CONSENT_STORAGE_KEY = 'bb_cookie_consent';

type CookieConsentRecord = {
  version: string;
  acceptedAt: string;
};

export function serializeCookieConsent(version: string, acceptedAt: Date): string {
  const record: CookieConsentRecord = { version, acceptedAt: acceptedAt.toISOString() };
  return JSON.stringify(record);
}

export function isCookieConsentCurrent(stored: string | null, version: string): boolean {
  if (!stored) return false;
  try {
    const parsed: unknown = JSON.parse(stored);
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as Partial<CookieConsentRecord>).version === version
    );
  } catch {
    return false;
  }
}
