import { describe, it, expect } from '@jest/globals';
import { computeProfileCompleteness } from './profileCompleteness';
import type { BaristaProfile } from '../types/baristaProfile';

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
  portfolioPhotos: ['https://example.com/p1.jpg'],
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
      portfolioPhotos: [],
    };
    expect(computeProfileCompleteness(empty).percent).toEqual(0);
  });

  it('counts a 49-char bio as not satisfied (DB trigger requires ≥50)', () => {
    const result = computeProfileCompleteness({ ...baseProfile, bio: 'x'.repeat(49) });
    expect(result.percent).toEqual(90);
    expect(result.items.find(i => i.key === 'bio')?.satisfied).toEqual(false);
  });

  it('drops 20% when only one of metro/shift preferences is set', () => {
    expect(computeProfileCompleteness({ ...baseProfile, preferredShiftTimes: [] }).percent).toEqual(
      80
    );
  });

  it('drops 10% when portfolio is empty', () => {
    expect(computeProfileCompleteness({ ...baseProfile, portfolioPhotos: [] }).percent).toEqual(90);
  });

  it('drops 10% when only one of hourlyRateMin/Max is set', () => {
    expect(
      computeProfileCompleteness({ ...baseProfile, hourlyRateMax: undefined }).percent
    ).toEqual(90);
  });

  it('exposes per-item weights and satisfaction for UI checklist', () => {
    const result = computeProfileCompleteness({ ...baseProfile, portfolioPhotos: [] });
    const portfolio = result.items.find(i => i.key === 'portfolio');
    expect(portfolio).toEqual({ key: 'portfolio', weight: 10, satisfied: false });
  });
});
