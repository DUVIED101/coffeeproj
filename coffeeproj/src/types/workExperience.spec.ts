import { describe, it, expect } from '@jest/globals';
import {
  computeDuration,
  computeTotalDuration,
  isDraftValid,
  makeEmptyDraft,
} from './workExperience';

describe('computeDuration', () => {
  it('counts a single-month engagement as one month', () => {
    expect(
      computeDuration({
        startYear: 2023,
        startMonth: 1,
        endYear: 2023,
        endMonth: 1,
        isCurrent: false,
      })
    ).toEqual({ years: 0, months: 1 });
  });

  it('counts a full calendar year (Jan–Dec) as exactly 12 months', () => {
    expect(
      computeDuration({
        startYear: 2023,
        startMonth: 1,
        endYear: 2023,
        endMonth: 12,
        isCurrent: false,
      })
    ).toEqual({ years: 1, months: 0 });
  });

  it('splits a span into years and remainder months', () => {
    expect(
      computeDuration({
        startYear: 2020,
        startMonth: 3,
        endYear: 2023,
        endMonth: 11,
        isCurrent: false,
      })
    ).toEqual({ years: 3, months: 9 });
  });

  it('handles cross-year spans (Nov 2022 → Feb 2023 = 4 months)', () => {
    expect(
      computeDuration({
        startYear: 2022,
        startMonth: 11,
        endYear: 2023,
        endMonth: 2,
        isCurrent: false,
      })
    ).toEqual({ years: 0, months: 4 });
  });

  it('uses the provided "now" as the end when isCurrent is true', () => {
    const now = new Date(2026, 4, 21); // 21 May 2026 (month is 0-indexed)
    expect(
      computeDuration(
        {
          startYear: 2023,
          startMonth: 1,
          endYear: null,
          endMonth: null,
          isCurrent: true,
        },
        now
      )
    ).toEqual({ years: 3, months: 5 });
  });

  it('returns zero when end is missing and not current (defensive)', () => {
    expect(
      computeDuration({
        startYear: 2023,
        startMonth: 1,
        endYear: null,
        endMonth: null,
        isCurrent: false,
      })
    ).toEqual({ years: 0, months: 0 });
  });
});

describe('computeTotalDuration', () => {
  it('returns zero for an empty list', () => {
    expect(computeTotalDuration([])).toEqual({ years: 0, months: 0 });
  });

  it('sums two non-overlapping past engagements', () => {
    // Jan–Dec 2022 (12 mo) + Mar–Apr 2023 (2 mo) = 14 mo = 1 y 2 m
    expect(
      computeTotalDuration([
        { startYear: 2022, startMonth: 1, endYear: 2022, endMonth: 12, isCurrent: false },
        { startYear: 2023, startMonth: 3, endYear: 2023, endMonth: 4, isCurrent: false },
      ])
    ).toEqual({ years: 1, months: 2 });
  });

  it('includes a current engagement using the provided "now"', () => {
    const now = new Date(2026, 4, 21);
    // Jan 2025 → May 2026 = 17 mo + Jun–Aug 2024 = 3 mo = 20 mo = 1 y 8 m
    expect(
      computeTotalDuration(
        [
          { startYear: 2025, startMonth: 1, endYear: null, endMonth: null, isCurrent: true },
          { startYear: 2024, startMonth: 6, endYear: 2024, endMonth: 8, isCurrent: false },
        ],
        now
      )
    ).toEqual({ years: 1, months: 8 });
  });
});

describe('isDraftValid', () => {
  it('rejects empty employer or position', () => {
    const draft = {
      ...makeEmptyDraft(),
      employer: '',
      position: 'Бариста',
      startYear: 2023,
      startMonth: 1,
      endYear: 2023,
      endMonth: 6,
    };
    expect(isDraftValid(draft)).toEqual(false);
  });

  it('rejects missing start date', () => {
    const draft = {
      ...makeEmptyDraft(),
      employer: 'Surf Coffee',
      position: 'Бариста',
      endYear: 2023,
      endMonth: 6,
    };
    expect(isDraftValid(draft)).toEqual(false);
  });

  it('rejects when end is before start', () => {
    const draft = {
      ...makeEmptyDraft(),
      employer: 'Surf Coffee',
      position: 'Бариста',
      startYear: 2023,
      startMonth: 6,
      endYear: 2023,
      endMonth: 3,
    };
    expect(isDraftValid(draft)).toEqual(false);
  });

  it('accepts isCurrent with end null', () => {
    const draft = {
      ...makeEmptyDraft(),
      employer: 'Surf Coffee',
      position: 'Бариста',
      startYear: 2023,
      startMonth: 1,
      isCurrent: true,
    };
    expect(isDraftValid(draft)).toEqual(true);
  });

  it('rejects isCurrent with end set', () => {
    const draft = {
      ...makeEmptyDraft(),
      employer: 'Surf Coffee',
      position: 'Бариста',
      startYear: 2023,
      startMonth: 1,
      endYear: 2023,
      endMonth: 6,
      isCurrent: true,
    };
    expect(isDraftValid(draft)).toEqual(false);
  });

  it('accepts a fully valid past engagement', () => {
    const draft = {
      ...makeEmptyDraft(),
      employer: 'Surf Coffee',
      position: 'Бариста',
      startYear: 2022,
      startMonth: 3,
      endYear: 2023,
      endMonth: 11,
    };
    expect(isDraftValid(draft)).toEqual(true);
  });
});
