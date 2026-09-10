import {
  COOKIE_CONSENT_STORAGE_KEY,
  isCookieConsentCurrent,
  serializeCookieConsent,
} from './cookieConsent';

const VERSION = '2026-09-15';
const ACCEPTED_AT = new Date('2026-09-20T10:00:00.000Z');

describe('serializeCookieConsent', () => {
  it('records the policy version and the acceptance time', () => {
    expect(JSON.parse(serializeCookieConsent(VERSION, ACCEPTED_AT))).toEqual({
      version: VERSION,
      acceptedAt: '2026-09-20T10:00:00.000Z',
    });
  });
});

describe('isCookieConsentCurrent', () => {
  it('is true for a consent recorded under the current policy version', () => {
    expect(isCookieConsentCurrent(serializeCookieConsent(VERSION, ACCEPTED_AT), VERSION)).toBe(
      true
    );
  });

  it.each([
    ['nothing stored', null],
    ['an older policy version', serializeCookieConsent('2026-06-12', ACCEPTED_AT)],
    ['a legacy acknowledgement flag', '1'],
    ['garbage', '{not json'],
    ['a record without a version', JSON.stringify({ acceptedAt: 'x' })],
  ])('is false for %s', (_label, stored) => {
    expect(isCookieConsentCurrent(stored, VERSION)).toBe(false);
  });
});

describe('COOKIE_CONSENT_STORAGE_KEY', () => {
  it('differs from the old acknowledgement key so nobody is grandfathered in', () => {
    expect(COOKIE_CONSENT_STORAGE_KEY).not.toBe('bb_cookie_notice_ack');
  });
});
