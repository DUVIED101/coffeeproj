import { describe, it, expect } from '@jest/globals';
import { computeProfileCompleteness } from './profileCompleteness';
import type { BaristaProfile } from '../types/baristaProfile';
import type { BaristaProfileId, WorkExperienceId } from '../types/ids';

// Future date well within the 50-year sanity-check constraint.
const FUTURE_MEDICAL_BOOK_EXPIRY = '2099-12-31';

const baseProfile: BaristaProfile = {
  id: 'p1',
  userId: 'u1',
  firstName: 'Иван',
  lastName: 'Иванов',
  dateOfBirth: '1990-05-20',
  city: 'Москва',
  bio: 'Я работаю бариста уже несколько лет, люблю кофе и обслуживание гостей.',
  yearsOfExperience: 3,
  equipmentExperience: ['La Marzocco'],
  certifications: [],
  languages: [],
  preferredMetroStations: ['Сокольники'],
  preferredShiftTimes: ['morning'],
  hourlyRateMin: 500,
  hourlyRateMax: 800,
  medicalBookExpiresOn: FUTURE_MEDICAL_BOOK_EXPIRY,
  portfolioPhotos: ['https://example.com/p1.jpg'],
  workExperiences: [
    {
      id: 'we1' as WorkExperienceId,
      baristaProfileId: 'p1' as BaristaProfileId,
      employer: 'Surf Coffee',
      position: 'Бариста',
      startYear: 2022,
      startMonth: 3,
      endYear: 2023,
      endMonth: 11,
      isCurrent: false,
      description: null,
      sortOrder: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ],
  isActivelyLooking: true,
  profileCompleteness: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('computeProfileCompleteness', () => {
  it('returns 100% when every category is satisfied', () => {
    expect(computeProfileCompleteness(baseProfile).percent).toEqual(100);
  });

  it('returns 0% for an empty profile', () => {
    const empty: BaristaProfile = {
      ...baseProfile,
      firstName: '',
      lastName: '',
      dateOfBirth: undefined,
      city: '',
      bio: undefined,
      yearsOfExperience: undefined,
      equipmentExperience: [],
      preferredMetroStations: [],
      preferredShiftTimes: [],
      hourlyRateMin: undefined,
      hourlyRateMax: undefined,
      medicalBookExpiresOn: undefined,
      portfolioPhotos: [],
      workExperiences: [],
    };
    expect(computeProfileCompleteness(empty).percent).toEqual(0);
  });

  it('counts a 19-char bio as not satisfied (DB trigger requires ≥20)', () => {
    const result = computeProfileCompleteness({ ...baseProfile, bio: 'x'.repeat(19) });
    expect(result.percent).toEqual(90);
    expect(result.items.find(i => i.key === 'bio')?.satisfied).toEqual(false);
  });

  it('drops 15% when only one of metro/shift preferences is set', () => {
    expect(computeProfileCompleteness({ ...baseProfile, preferredShiftTimes: [] }).percent).toEqual(
      85
    );
  });

  it('drops 10% when portfolio is empty', () => {
    expect(computeProfileCompleteness({ ...baseProfile, portfolioPhotos: [] }).percent).toEqual(90);
  });

  it('drops 10% when both hourlyRate bounds are unset', () => {
    expect(
      computeProfileCompleteness({
        ...baseProfile,
        hourlyRateMin: undefined,
        hourlyRateMax: undefined,
      }).percent
    ).toEqual(90);
  });

  it('still counts hourlyRate when only one bound is set', () => {
    expect(
      computeProfileCompleteness({ ...baseProfile, hourlyRateMax: undefined }).percent
    ).toEqual(100);
  });

  it('drops 10% when work history is empty', () => {
    expect(computeProfileCompleteness({ ...baseProfile, workExperiences: [] }).percent).toEqual(90);
  });

  it('drops 10% when work history is undefined', () => {
    expect(
      computeProfileCompleteness({ ...baseProfile, workExperiences: undefined }).percent
    ).toEqual(90);
  });

  it('drops 10% when medical book is missing', () => {
    expect(
      computeProfileCompleteness({ ...baseProfile, medicalBookExpiresOn: undefined }).percent
    ).toEqual(90);
  });

  it('drops 10% when medical book is expired', () => {
    expect(
      computeProfileCompleteness({ ...baseProfile, medicalBookExpiresOn: '2000-01-01' }).percent
    ).toEqual(90);
  });

  it('exposes per-item weights and satisfaction for UI checklist', () => {
    const result = computeProfileCompleteness({ ...baseProfile, portfolioPhotos: [] });
    const portfolio = result.items.find(i => i.key === 'portfolio');
    expect(portfolio).toEqual({ key: 'portfolio', weight: 10, satisfied: false });
  });
});
