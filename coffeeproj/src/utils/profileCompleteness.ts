import type { BaristaProfile } from '../types/baristaProfile';

// Keys map to i18n labels under `barista.completeness.items.*` so the UI can
// localise. Keep in sync with
// supabase/migrations/048_completeness_with_work_experience.sql — this function
// mirrors the DB trigger so the client checklist matches the percent that the
// DB will store.
export type CompletenessItemKey =
  | 'basicInfo'
  | 'bio'
  | 'experience'
  | 'workHistory'
  | 'preferences'
  | 'hourlyRate'
  | 'portfolio';

export type CompletenessItem = {
  key: CompletenessItemKey;
  weight: number;
  satisfied: boolean;
};

export type ProfileCompleteness = {
  percent: number;
  items: CompletenessItem[];
};

const BIO_MIN_LENGTH = 50;

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

const isNonEmptyArray = (v: unknown): boolean => Array.isArray(v) && v.length > 0;

export function computeProfileCompleteness(profile: BaristaProfile): ProfileCompleteness {
  const items: CompletenessItem[] = [
    {
      key: 'basicInfo',
      weight: 20,
      satisfied:
        isNonEmptyString(profile.firstName) &&
        isNonEmptyString(profile.lastName) &&
        isNonEmptyString(profile.city) &&
        isNonEmptyString(profile.dateOfBirth),
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
      weight: 15,
      satisfied: isNonEmptyArray(profile.workExperiences),
    },
    {
      key: 'preferences',
      weight: 20,
      satisfied:
        isNonEmptyArray(profile.preferredMetroStations) &&
        isNonEmptyArray(profile.preferredShiftTimes),
    },
    {
      key: 'hourlyRate',
      weight: 10,
      satisfied: typeof profile.hourlyRateMin === 'number',
    },
    {
      key: 'portfolio',
      weight: 10,
      satisfied: isNonEmptyArray(profile.portfolioPhotos),
    },
  ];

  const percent = items.reduce((acc, item) => (item.satisfied ? acc + item.weight : acc), 0);
  return { percent, items };
}
