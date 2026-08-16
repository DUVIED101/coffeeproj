import { describe, it, expect } from '@jest/globals';
import { validateEmployerDetails, isValidWebsite, isValidSocialValue } from './employerSubtype';

describe('isValidWebsite', () => {
  it('accepts a fully qualified https url', () => {
    expect(isValidWebsite('https://example.com')).toBe(true);
  });

  it('accepts a domain without scheme', () => {
    expect(isValidWebsite('example.com/path')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidWebsite('  ')).toBe(false);
  });

  it('rejects a string with no dot', () => {
    expect(isValidWebsite('example')).toBe(false);
  });
});

describe('isValidSocialValue', () => {
  it('accepts a plain instagram handle', () => {
    expect(isValidSocialValue('instagram', 'coffeeshop')).toBe(true);
  });

  it('accepts an instagram handle with leading @', () => {
    expect(isValidSocialValue('instagram', '@coffeeshop')).toBe(true);
  });

  it('rejects a too-short handle', () => {
    expect(isValidSocialValue('telegram', 'a')).toBe(false);
  });

  it('requires a valid url for the website platform', () => {
    expect(isValidSocialValue('website', 'example.com')).toBe(true);
    expect(isValidSocialValue('website', 'not-a-url')).toBe(false);
  });
});

describe('validateEmployerDetails', () => {
  it('returns the юрлицо error when name is empty for organization', () => {
    expect(
      validateEmployerDetails({
        legalForm: 'organization',
        businessName: '   ',
      })
    ).toBe('auth.errors.noOrgName');
  });

  it('returns the ИП error when name is empty for individual_entrepreneur', () => {
    expect(
      validateEmployerDetails({
        legalForm: 'individual_entrepreneur',
        businessName: '',
      })
    ).toBe('auth.errors.noIpName');
  });

  it('returns null when only the required name is provided', () => {
    expect(
      validateEmployerDetails({
        legalForm: 'organization',
        businessName: 'ООО "Кофейня №1"',
      })
    ).toBeNull();
  });

  it('allows an optional valid website', () => {
    expect(
      validateEmployerDetails({
        legalForm: 'individual_entrepreneur',
        businessName: 'ИП Иванов И.И.',
        website: 'https://my-shop.ru',
      })
    ).toBeNull();
  });

  it('rejects an invalid website', () => {
    expect(
      validateEmployerDetails({
        legalForm: 'organization',
        businessName: 'ООО Кофейня',
        website: 'not a url',
      })
    ).toBe('auth.errors.invalidWebsite');
  });

  it('allows an optional valid social link', () => {
    expect(
      validateEmployerDetails({
        legalForm: 'individual_entrepreneur',
        businessName: 'ИП Иванов И.И.',
        socialLink: { platform: 'instagram', value: 'mycoffee' },
      })
    ).toBeNull();
  });

  it('rejects an invalid social link value', () => {
    expect(
      validateEmployerDetails({
        legalForm: 'individual_entrepreneur',
        businessName: 'ИП Иванов И.И.',
        socialLink: { platform: 'telegram', value: '!' },
      })
    ).toBe('auth.errors.invalidSocial');
  });

  it('ignores empty optional fields', () => {
    expect(
      validateEmployerDetails({
        legalForm: 'organization',
        businessName: 'ООО Кофейня',
        website: '   ',
        socialLink: { platform: 'instagram', value: '' },
      })
    ).toBeNull();
  });
});
