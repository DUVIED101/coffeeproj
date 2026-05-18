import { describe, it, expect } from '@jest/globals';
import { formatLocalDate } from './dateUtils';

describe('formatLocalDate', () => {
  it('formats a midnight local date as YYYY-MM-DD without shifting day', () => {
    const date = new Date(2000, 0, 20); // 20 Jan 2000, local midnight
    expect(formatLocalDate(date)).toEqual('2000-01-20');
  });

  it('zero-pads single-digit months and days', () => {
    const date = new Date(2024, 2, 5); // 5 Mar 2024
    expect(formatLocalDate(date)).toEqual('2024-03-05');
  });

  it('handles late-evening local times that would roll forward in UTC', () => {
    const date = new Date(2024, 11, 31, 23, 30); // 31 Dec 2024 23:30 local
    expect(formatLocalDate(date)).toEqual('2024-12-31');
  });

  it('handles early-morning local times that would roll back in UTC', () => {
    const date = new Date(2024, 0, 1, 1, 0); // 1 Jan 2024 01:00 local
    expect(formatLocalDate(date)).toEqual('2024-01-01');
  });
});
