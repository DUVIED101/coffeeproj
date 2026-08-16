import type { LegalForm, SocialPlatform } from '../types';

export interface EmployerDetailsInput {
  legalForm: LegalForm;
  businessName: string;
  website?: string;
  socialLink?: {
    platform: SocialPlatform;
    value: string;
  };
}

export const isValidWebsite = (raw: string): boolean => {
  const value = raw.trim();
  if (value.length === 0) return false;
  return /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i.test(value);
};

export const isValidSocialValue = (platform: SocialPlatform, raw: string): boolean => {
  const value = raw.trim();
  if (value.length === 0) return false;
  if (platform === 'website' || platform === 'other') {
    return isValidWebsite(value);
  }
  return /^[a-zA-Z0-9._\-/]{2,64}$/.test(value.replace(/^@/, ''));
};

export const validateEmployerDetails = (input: EmployerDetailsInput): string | null => {
  const name = input.businessName.trim();
  if (name.length === 0) {
    return input.legalForm === 'organization' ? 'auth.errors.noOrgName' : 'auth.errors.noIpName';
  }
  if (name.length < 2) {
    return 'auth.errors.nameTooShort';
  }

  if (input.website !== undefined && input.website.trim().length > 0) {
    if (!isValidWebsite(input.website)) {
      return 'auth.errors.invalidWebsite';
    }
  }

  if (input.socialLink !== undefined && input.socialLink.value.trim().length > 0) {
    if (!isValidSocialValue(input.socialLink.platform, input.socialLink.value)) {
      return 'auth.errors.invalidSocial';
    }
  }

  return null;
};
