import type { BaristaFilters, BaristaProfile } from '../types/baristaProfile';

type FilterRow = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  city: string;
  avatar_url: string | null;
  bio: string | null;
  years_of_experience: number | null;
  equipment_experience: string[] | null;
  certifications: string[] | null;
  languages: string[] | null;
  preferred_metro_stations: string[] | null;
  preferred_shift_times: string[] | null;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  available_from_date: string | null;
  portfolio_photos: string[] | null;
  is_actively_looking: boolean;
  profile_completeness: number | null;
  created_at: string;
  updated_at: string;
};

type QueryBuilderMock = {
  select: jest.Mock;
  eq: jest.Mock;
  overlaps: jest.Mock;
  gte: jest.Mock;
  lte: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
};

const MOSCOW = 'Moscow';
const DEFAULT_MIN_COMPLETENESS = 30;
const PAGE_SIZE = 20;

const SAMPLE_ROW: FilterRow = {
  id: 'profile-id-1',
  user_id: 'user-id-1',
  first_name: 'Anna',
  last_name: 'Petrova',
  date_of_birth: '1995-06-15',
  city: MOSCOW,
  avatar_url: 'https://cdn.example/avatar-1.jpg',
  bio: 'Specialty coffee enthusiast',
  years_of_experience: 4,
  equipment_experience: ['La Marzocco'],
  certifications: ['SCA Barista Skills'],
  languages: ['ru', 'en'],
  preferred_metro_stations: ['Tverskaya'],
  preferred_shift_times: ['morning', 'evening'],
  hourly_rate_min: 500,
  hourly_rate_max: 1200,
  available_from_date: '2026-05-01',
  portfolio_photos: ['https://cdn.example/photo-1.jpg'],
  is_actively_looking: true,
  profile_completeness: 85,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-04-10T00:00:00.000Z',
};

const EXPECTED_MAPPED_ROW: BaristaProfile = {
  id: 'profile-id-1',
  userId: 'user-id-1',
  firstName: 'Anna',
  lastName: 'Petrova',
  dateOfBirth: '1995-06-15',
  city: MOSCOW,
  avatarUrl: 'https://cdn.example/avatar-1.jpg',
  bio: 'Specialty coffee enthusiast',
  yearsOfExperience: 4,
  equipmentExperience: ['La Marzocco'],
  certifications: ['SCA Barista Skills'],
  languages: ['ru', 'en'],
  preferredMetroStations: ['Tverskaya'],
  preferredShiftTimes: ['morning', 'evening'] as BaristaProfile['preferredShiftTimes'],
  hourlyRateMin: 500,
  hourlyRateMax: 1200,
  availableFromDate: '2026-05-01',
  portfolioPhotos: ['https://cdn.example/photo-1.jpg'],
  isActivelyLooking: true,
  profileCompleteness: 85,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-04-10T00:00:00.000Z',
};

const createQueryBuilderMock = (rows: FilterRow[]): QueryBuilderMock => {
  const builder: Partial<QueryBuilderMock> = {};
  const chain = () => builder as QueryBuilderMock;

  builder.select = jest.fn(chain);
  builder.eq = jest.fn(chain);
  builder.overlaps = jest.fn(chain);
  builder.gte = jest.fn(chain);
  builder.lte = jest.fn(chain);
  builder.order = jest.fn(chain);
  builder.range = jest.fn(() => Promise.resolve({ data: rows, error: null }));

  return builder as QueryBuilderMock;
};

const mockFrom = jest.fn();

jest.mock('../config/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Import after jest.mock so the service receives the mocked supabase client.
import { BaristaSearchService } from './BaristaSearchService';

describe('searchBaristas', () => {
  let builder: QueryBuilderMock;

  beforeEach(() => {
    builder = createQueryBuilderMock([SAMPLE_ROW]);
    mockFrom.mockReset();
    mockFrom.mockReturnValue(builder);
  });

  it('applies only the actively-looking and default completeness filters when no filters are provided', async () => {
    const filters: BaristaFilters = {};

    await BaristaSearchService.searchBaristas(filters);

    expect(mockFrom).toHaveBeenCalledWith('barista_profiles');
    expect(builder.select).toHaveBeenCalledWith('*');
    expect(builder.eq).toHaveBeenCalledWith('is_actively_looking', true);
    expect(builder.eq).toHaveBeenCalledTimes(1);
    expect(builder.overlaps).not.toHaveBeenCalled();
    expect(builder.lte).not.toHaveBeenCalled();
    expect(builder.gte).toHaveBeenCalledWith('profile_completeness', DEFAULT_MIN_COMPLETENESS);
    expect(builder.gte).toHaveBeenCalledTimes(1);
  });

  it('applies every corresponding filter and an overridden minCompleteness when all filters are provided', async () => {
    const filters: BaristaFilters = {
      city: MOSCOW,
      equipment: ['La Marzocco', 'Slayer'],
      metroStations: ['Tverskaya', 'Arbatskaya'],
      shiftTimes: ['morning', 'evening'],
      languages: ['ru', 'en'],
      certifications: ['SCA Barista Skills'],
      minYearsExperience: 3,
      hourlyRateMax: 1500,
      minCompleteness: 60,
    };

    await BaristaSearchService.searchBaristas(filters);

    expect(builder.eq).toHaveBeenCalledWith('is_actively_looking', true);
    expect(builder.eq).toHaveBeenCalledWith('city', filters.city);
    expect(builder.overlaps).toHaveBeenCalledWith('equipment_experience', filters.equipment);
    expect(builder.overlaps).toHaveBeenCalledWith(
      'preferred_metro_stations',
      filters.metroStations
    );
    expect(builder.overlaps).toHaveBeenCalledWith('preferred_shift_times', filters.shiftTimes);
    expect(builder.overlaps).toHaveBeenCalledWith('languages', filters.languages);
    expect(builder.overlaps).toHaveBeenCalledWith('certifications', filters.certifications);
    expect(builder.gte).toHaveBeenCalledWith('years_of_experience', filters.minYearsExperience);
    expect(builder.lte).toHaveBeenCalledWith('hourly_rate_max', filters.hourlyRateMax);
    expect(builder.gte).toHaveBeenCalledWith('profile_completeness', filters.minCompleteness);
    expect(builder.gte).not.toHaveBeenCalledWith('profile_completeness', DEFAULT_MIN_COMPLETENESS);
  });

  it.each([
    { page: undefined, expectedFrom: 0, expectedTo: PAGE_SIZE - 1 },
    { page: 2, expectedFrom: 2 * PAGE_SIZE, expectedTo: 2 * PAGE_SIZE + PAGE_SIZE - 1 },
  ])(
    'paginates with range($expectedFrom, $expectedTo) when page=$page',
    async ({ page, expectedFrom, expectedTo }) => {
      const filters: BaristaFilters = {};

      if (page === undefined) {
        await BaristaSearchService.searchBaristas(filters);
      } else {
        await BaristaSearchService.searchBaristas(filters, page);
      }

      expect(builder.range).toHaveBeenCalledWith(expectedFrom, expectedTo);
      expect(builder.range).toHaveBeenCalledTimes(1);
    }
  );

  it('maps snake_case Supabase rows to camelCase BaristaProfile shape', async () => {
    const filters: BaristaFilters = {};

    const result = await BaristaSearchService.searchBaristas(filters);

    expect(result).toEqual([EXPECTED_MAPPED_ROW]);
  });
});
