import type { BaristaProfile } from '../types/baristaProfile';
import { computeMedicalBookStatus } from './medicalBook';

// Keys map to i18n labels under `barista.completeness.items.*` so the UI can
// localise. Keep in sync with
// supabase/migrations/082_completeness_with_medical_book.sql — this function
// mirrors the DB trigger so the client checklist matches the percent that the
// DB will store.
export type CompletenessItemKey =
  | 'basicInfo'
  | 'bio'
  | 'experience'
  | 'workHistory'
  | 'preferences'
  | 'hourlyRate'
  | 'portfolio'
  | 'medicalBook';

export type CompletenessItem = {
  key: CompletenessItemKey;
  weight: number;
  satisfied: boolean;
};

export type ProfileCompleteness = {
  percent: number;
  items: CompletenessItem[];
};

const BIO_MIN_LENGTH = 20;

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

const isNonEmptyArray = (v: unknown): boolean => Array.isArray(v) && v.length > 0;

export function computeProfileCompleteness(profile: BaristaProfile): ProfileCompleteness {
  const medicalStatus = computeMedicalBookStatus(profile.medicalBookExpiresOn);
  const items: CompletenessItem[] = [
    {
      key: 'basicInfo',
      weight: 20,
      satisfied:
        isNonEmptyString(profile.firstName) &&
        isNonEmptyString(profile.lastName) &&
        isNonEmptyString(profile.city),
    },
    {
      key: 'bio',
      weight: 10,
      satisfied: isNonEmptyString(profile.bio) && profile.bio.trim().length >= BIO_MIN_LENGTH,
    },
    {
      key: 'experience',
      weight: 15,
      satisfied:
        typeof profile.yearsOfExperience === 'number' &&
        isNonEmptyArray(profile.equipmentExperience),
    },
    {
      key: 'workHistory',
      weight: 10,
      satisfied: isNonEmptyArray(profile.workExperiences),
    },
    {
      key: 'preferences',
      weight: 15,
      satisfied:
        isNonEmptyArray(profile.preferredMetroStations) &&
        isNonEmptyArray(profile.preferredShiftTimes),
    },
    {
      key: 'hourlyRate',
      weight: 10,
      satisfied:
        typeof profile.hourlyRateMin === 'number' || typeof profile.hourlyRateMax === 'number',
    },
    {
      key: 'portfolio',
      weight: 10,
      satisfied: isNonEmptyArray(profile.portfolioPhotos),
    },
    {
      key: 'medicalBook',
      weight: 10,
      satisfied: medicalStatus === 'valid' || medicalStatus === 'expiringSoon',
    },
  ];

  const percent = items.reduce((acc, item) => (item.satisfied ? acc + item.weight : acc), 0);
  return { percent, items };
}
