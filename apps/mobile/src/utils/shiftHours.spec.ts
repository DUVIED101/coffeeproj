import type { ShiftDetails, TemporaryShiftDetails } from '../types/job';
import { computeShiftHours } from './shiftHours';

const baseShift = (overrides: Partial<TemporaryShiftDetails>): TemporaryShiftDetails => ({
  kind: 'temporary',
  startDate: '2026-04-13',
  endDate: undefined,
  startTime: '09:00',
  endTime: '17:00',
  isRecurring: false,
  recurringDays: undefined,
  ...overrides,
});

describe('computeShiftHours', () => {
  describe('non-recurring shifts', () => {
    it('computes a same-day shift to one decimal', () => {
      const shift = baseShift({ startTime: '09:00', endTime: '17:30' });

      expect(computeShiftHours(shift)).toBe(8.5);
    });

    it('computes a multi-day shift as the elapsed time between start and end', () => {
      // 2026-04-13 20:00 → 2026-04-14 04:00 = 8 hours elapsed.
      const shift = baseShift({
        startDate: '2026-04-13',
        endDate: '2026-04-14',
        startTime: '20:00',
        endTime: '04:00',
      });

      expect(computeShiftHours(shift)).toBe(8);
    });

    it('handles cross-midnight when endDate is omitted by treating it as next-day', () => {
      const shift = baseShift({ startTime: '22:00', endTime: '06:00' });

      expect(computeShiftHours(shift)).toBe(8);
    });
  });

  describe('recurring shifts', () => {
    it('counts weekly recurring days across a 14-day window', () => {
      // Monday 2026-04-13 through Sunday 2026-04-26 = 14 days inclusive.
      // Mon/Wed/Fri occur 6 times. 09:00-17:00 = 8h. Total = 48h.
      const shift = baseShift({
        startDate: '2026-04-13',
        endDate: '2026-04-26',
        startTime: '09:00',
        endTime: '17:00',
        isRecurring: true,
        recurringDays: ['monday', 'wednesday', 'friday'],
      });

      expect(computeShiftHours(shift)).toBe(48);
    });

    it('respects partial-week boundaries', () => {
      // 2026-04-13 (Mon) through 2026-04-15 (Wed) → only Mon and Wed match.
      const shift = baseShift({
        startDate: '2026-04-13',
        endDate: '2026-04-15',
        startTime: '10:00',
        endTime: '14:00',
        isRecurring: true,
        recurringDays: ['monday', 'wednesday', 'friday'],
      });

      expect(computeShiftHours(shift)).toBe(8);
    });

    it('handles cross-midnight endTime by adding 24h before subtracting', () => {
      // 4 Mondays in [2026-04-06, 2026-04-27]; each 22:00→06:00 = 8h. Total = 32h.
      const shift = baseShift({
        startDate: '2026-04-06',
        endDate: '2026-04-27',
        startTime: '22:00',
        endTime: '06:00',
        isRecurring: true,
        recurringDays: ['monday'],
      });

      expect(computeShiftHours(shift)).toBe(32);
    });

    it('returns 0 when no weekdays in the window match', () => {
      // Tuesday only, but window is just one Monday.
      const shift = baseShift({
        startDate: '2026-04-13',
        endDate: '2026-04-13',
        startTime: '09:00',
        endTime: '17:00',
        isRecurring: true,
        recurringDays: ['tuesday'],
      });

      expect(computeShiftHours(shift)).toBe(0);
    });
  });

  describe('permanent shifts', () => {
    it('returns 0 because completed-hours data lives outside the shift descriptor', () => {
      const shift: ShiftDetails = {
        kind: 'permanent',
        startDate: '2026-04-13',
        hoursPerWeek: 40,
      };

      expect(computeShiftHours(shift)).toBe(0);
    });
  });
});
